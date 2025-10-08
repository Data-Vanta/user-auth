const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const File = sequelize.define('File', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  originalFilename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  storagePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mimetype: {  //  the mimetype is a reliable identifier that is more accurate than just looking at the file extension 
    type: DataTypes.STRING,
    allowNull: false
  },
  sizeInBytes: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'UPLOADED' // e.g., UPLOADED, PROCESSING, COMPLETED, FAILED
  }
}, {
  timestamps: true
});

File.associate = function(models) {
  // A File belongs to one User
  File.belongsTo(models.User, { foreignKey: 'userId' });
};

module.exports = File;