const Team = require("./team.model");
const TeamMember = require("./teamMember.model");
const User = require("../user/user.model");
const Role = require("../role/role.model");
const Permission = require("../permission/permission.model");

class TeamRepository {
  async create(teamData) {
    return await Team.create(teamData);
  }

  async findAll() {
    const teams = await Team.findAll();
    // Attach members with role details for each team
    const results = [];
    for (const t of teams) {
      const members = await this.getTeamMembers(t.team_id);
      const mappedMembers = members.map(m => ({ user: m.user, role: m.role }));
      const teamPlain = t.get ? t.get({ plain: true }) : t;
      teamPlain.members = mappedMembers;
      results.push(teamPlain);
    }
    return results;
  }

  async findById(team_id) {
    const team = await Team.findByPk(team_id);
    if (!team) return null;
    const members = await this.getTeamMembers(team_id);
    const mappedMembers = members.map(m => ({ user: m.user, role: m.role }));
    const teamPlain = team.get ? team.get({ plain: true }) : team;
    teamPlain.members = mappedMembers;
    return teamPlain;
  }

  async updateById(team_id, updateData) {
    const [affectedCount] = await Team.update(updateData, { 
      where: { team_id } 
    });
    return affectedCount > 0;
  }

  async deleteById(team_id) {
    return await Team.destroy({ where: { team_id } });
  }

  // Team Member methods
  async addMember(team_id, user_id, role_id) {
    // Verify role exists
    const role = await Role.findByPk(role_id);
    if (!role) {
      throw { statusCode: 404, message: "Role not found" };
    }
    return await TeamMember.create({ team_id, user_id, role_id });
  }

  async removeMember(team_id, user_id) {
    return await TeamMember.destroy({ 
      where: { team_id, user_id } 
    });
  }

  async updateMemberRole(team_id, user_id, role_id) {
    const [affectedCount] = await TeamMember.update(
      { role_id }, 
      { where: { team_id, user_id } }
    );
    return affectedCount > 0;
  }

  async getTeamMembers(team_id) {
    const members = await TeamMember.findAll({
      where: { team_id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Role,
          as: 'role',
          attributes: ['role_id', 'name']
        }
      ]
    });
    // Return only user and role (omit team_id and other TeamMember fields)
    return members.map(m => ({ user: m.user, role: m.role }));
  }

  async getUserTeams(user_id) {
    return await TeamMember.findAll({
      where: { user_id },
      include: [{
        model: Team,
        as: 'team'
      }]
    });
  }

  async getUserRoleInTeam(team_id, user_id) {
    return await TeamMember.findOne({
      where: { team_id, user_id },
      include: [{
        model: Role,
        as: 'role',
        include: [{
          model: Permission,
          through: { attributes: [] }
        }]
      }]
    });
  }

  async isUserInTeam(team_id, user_id) {
    const member = await TeamMember.findOne({
      where: { team_id, user_id }
    });
    return !!member;
  }
}

module.exports = new TeamRepository();