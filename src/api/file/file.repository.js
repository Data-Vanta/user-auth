const File = require('./file.model');

class FileRepository {
  async create(fileData) {
    return await File.create(fileData);
  }

  /**
   * Finds all files associated with a specific user.
   * @param {string} userId - The UUID of the user.
   * @returns {Promise<object[]>} A list of file objects.
   */
  async findAllByUserId(userId) {
    return await File.findAll({ where: { userId } });
  }

  async findById(id) {
    return await File.findOne({ where: { id } });
  }

  async deleteById(id) {
    return await File.destroy({ where: { id } });
  }
}

module.exports = new FileRepository();