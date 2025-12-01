const dfd = require('danfojs-node');
const fs = require('fs').promises;
const path = require('path');
const FileRepository = require('../file/file.repository');
const ProcessRepository = require('./process.repository');

class ProcessService {
  constructor() {
    this.processRepository = ProcessRepository;
    this.fileRepository = FileRepository;
    
    this.csvReadOptions = {
      header: true,
      delimiter: ",",
      skipEmptyLines: true,
      encoding: "utf8",
      dynamicTyping: true,
    };
  }

  // ===============================================
  // ==        ANALYSIS METHODS                   ==
  // ===============================================

  async analyzeFile(fileId, userId) {
    const file = await this.fileRepository.findByIdAndUserId(fileId, userId);
    if (!file) {
      throw { statusCode: 404, message: "File not found or access denied" };
    }

   const existingAnalysis = await this.processRepository.findByFileId(fileId);
   if (existingAnalysis && file.updatedAt <= existingAnalysis.updatedAt) {
     console.log('Returning cached analysis result.');
     return existingAnalysis;
   }
    
    console.log('Performing new file analysis.');
    const df = await dfd.readCSV(file.storagePath, this.csvReadOptions);

    const analysisData = {
      fileId,
      metadata: this.getMetadata(df),
      missingValues: this.getMissingValues(df),
      summaryStatistics: this.getSummaryStatistics(df),
      uniqueValues: this.getUniqueValues(df),
      status: 'COMPLETED'
    };

    return await this.processRepository.createOrUpdate(fileId, analysisData);
  }

  getMetadata(df) {
    return {
      columnNames: df.columns,
      dataTypes: df.ctypes.values,
      rows: df.shape[0],
      columns: df.shape[1],
    };
  }


  getSummaryStatistics(df) {
    const numericCols = df.columns.filter(col => {
      const dtype = df[col].dtype;
      return dtype === 'int32' || dtype === 'float32';
    });

    if (numericCols.length === 0) {
      return { message: "No numeric columns found to describe." };
    }

    // Initialize an empty object to hold the results
    const summary = {};

    numericCols.forEach(col => {
      const columnSeries = df[col]; // Get the column as a Series
      // Calculate stats for the current column and add it to our summary object
      summary[col] = {
        count: columnSeries.count(),
        mean: columnSeries.mean(),
        std: columnSeries.std(),
        min: columnSeries.min(),
        median: columnSeries.median(),     
        max: columnSeries.max()
      };
    });

    // Return the completed summary object
    return summary;
  }

  getMissingValues(df) {
    const missingSeries = df.isNa().sum();
    const result = dfd.toJSON(missingSeries, { format: 'row' });
    return result[0];
  }

  getUniqueValues(df) {
    const result = {};
    df.columns.forEach(col => {
      const uniqueVals = df[col].unique();
      const sample = uniqueVals.values.slice(0, Math.min(uniqueVals.size , 5));
      const uniqueCount = uniqueVals.size;
      result[col] = { count: uniqueCount, sample: sample };
    });
    return result;
  }

  // ===============================================
  // ==      DATA TRANSFORMATION METHODS          ==
  // ===============================================

  async normalizeColumnNames(fileId, userId) {
    const file = await this.fileRepository.findByIdAndUserId(fileId, userId);
    if (!file) {
      throw { statusCode: 404, message: "File not found or access denied" };
    }

    let df = await dfd.readCSV(file.storagePath, this.csvReadOptions);

    const newColumns = df.columns.map(col =>
      col.toLowerCase()
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
    );

    const mapper = Object.fromEntries(df.columns.map((oldCol, i) => [oldCol, newColumns[i]]));
    df.rename(mapper, { axis: 1, inplace: true });
    return await this._overwriteAndBackupFile(df, file);
  }

  async handleMissingValues(fileId, userId, options) {
    const { column, strategy, fillValue } = options;
    const file = await this.fileRepository.findByIdAndUserId(fileId, userId);
    if (!file) throw { statusCode: 404, message: "File not found or access denied" };

    let df = await dfd.readCSV(file.storagePath, this.csvReadOptions);
    if (!df.columns.includes(column)) {
      throw { statusCode: 400, message: `Column '${column}' not found.` };
    }

    const colSeries = df[column];
    const colDtype = colSeries.dtype; // e.g., "int32", "float32", "string"

    // Helper to ensure numeric-only
    const ensureNumeric = () => {
      if (!['int32', 'float32', 'float64', 'int64', 'number'].includes(colDtype)) {
        throw { statusCode: 400, message: `Column '${column}' must be numeric for '${strategy}' strategy.` };
      }
    };

    switch (strategy) {
      case 'drop': {
        const keepMask = colSeries.isNa().apply(v => !v).values;
        df = df.loc({ rows: keepMask });
        break;
      }

      case 'mean': {
        ensureNumeric();
        const meanVal = colSeries.mean();
        df.fillNa([meanVal], { columns: [column], inplace: true });
        break;
      }

      case 'median': {
        ensureNumeric();
        const medianVal = colSeries.median();
        df.fillNa([medianVal], { columns: [column], inplace: true });
        break;
      }

      case 'mode': {
        const modeArr = colSeries.mode();
        const modeVal = Array.isArray(modeArr) ? modeArr[0] : modeArr;
        df.fillNa([modeVal], { columns: [column], inplace: true });
        break;
      }

      case 'fill': {
        if (fillValue === undefined)
          throw { statusCode: 400, message: "A 'fillValue' is required for 'fill' strategy." };
        df.fillNa([fillValue], { columns: [column], inplace: true });
        break;
      }

      default:
        throw { statusCode: 400, message: `Invalid strategy: '${strategy}'.` };
    }

    return await this._overwriteAndBackupFile(df, file);
  }


  // ===============================================
  // ==            ROLLBACK METHOD                ==
  // ===============================================

  async rollbackFile(fileId, userId) {
    const file = await this.fileRepository.findByIdAndUserId(fileId, userId);
    if (!file) {
      throw { statusCode: 404, message: "File not found or access denied" };
    }
    if (!file.backupStoragePath) {
      throw { statusCode: 400, message: "No previous version available to rollback to." };
    }

    await fs.unlink(file.storagePath);
    await fs.rename(file.backupStoragePath, file.storagePath);

    const stats = await fs.stat(file.storagePath);
    file.backupStoragePath = null;
    file.sizeInBytes = stats.size;
    await file.save();

    return file;
  }

  /**
   * Private helper to save a DataFrame by overwriting the original file
   * and creating a backup of the previous version.
   * @private
   */
  async _overwriteAndBackupFile(df, file) {
    const backupPath = `${file.storagePath}.bak`;

    if (file.backupStoragePath) {
      await fs.unlink(file.backupStoragePath).catch(() => {});
    }

    await fs.rename(file.storagePath, backupPath);
    await dfd.toCSV(df, { filePath: file.storagePath });

    const stats = await fs.stat(file.storagePath);
    file.backupStoragePath = backupPath;
    file.sizeInBytes = stats.size;
    await file.save();

    return file;
  }
}

module.exports = ProcessService;