const sequelize = require('../config/database');
const Role = require('../api/role/role.model');
const Permission = require('../api/permission/permission.model');
// ensure role-permission join model is loaded so associations exist
require('../api/role/rolePermission.model');

async function seed() {
  try {
    await sequelize.authenticate();
    // Ensure tables exist before seeding join table data
    await sequelize.sync({ alter: true });

    const permissions = [
      'team_view',
    ];

    const createdPerms = [];
    for (const name of permissions) {
      const [perm] = await Permission.findOrCreate({ where: { name } });
      createdPerms.push(perm);
    }

    // Create roles
    const [ownerRole] = await Role.findOrCreate({ where: { name: 'Viewer' } });

    // Assign all permissions to Admin
    await ownerRole.setPermissions(createdPerms);

    console.log('Seeding complete: roles and permissions created and associated.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
