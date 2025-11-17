// Repositories (placeholders - implement these similarly to other repos)

// Validators (placeholders)
import { InputValidator } from './validators/input.validator';
import { RoleValidator } from './validators/role.validator';

// Builders / Helpers (optional)
import { RoleDocumentBuilder } from './builders/document.builder';
import { BaseModule } from '../utils';
import { withTransaction } from '../utils/withTransaction';
import { ApiError } from '../utils/apiResponse';
import { UserRepository } from '../features/user/repository/user.repository';

// Types
export interface IRoleCreateInput {
  name: string;
  permissions?: string[];
  createdBy: string;
}

export interface IRoleUpdateInput {
  roleId: string;
  name?: string;
  permissions?: string[];
  updatedBy: string;
}

export interface IRoleAssignInput {
  roleId: string;
  userId: string;
  assignedBy: string;
}

export interface IRole {
  _id: string;
  name: string;
  permissions: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Response type for create
export type CreateRoleResponse = {
  success: boolean;
  role: IRole;
};

export class RoleManagementService extends BaseModule {
  private readonly roleRepo: RoleRepository;
  private readonly userRepo: UserRepository;

  private readonly inputValidator: InputValidator;
  private readonly roleValidator: RoleValidator;

  private readonly docBuilder: RoleDocumentBuilder;

  constructor() {
    super();

    this.roleRepo = new RoleRepository();
    this.userRepo = new UserRepository();

    this.inputValidator = new InputValidator();
    this.roleValidator = new RoleValidator();

    this.docBuilder = new RoleDocumentBuilder();
  }

  // Create a new role with validations and transaction safety
  async createRole(input: IRoleCreateInput): Promise<CreateRoleResponse> {
    return await withTransaction('Creating new role', async (session) => {
      const { name, permissions = [], createdBy } = input;

      // 1️⃣ Validate input
      await this.inputValidator.validate(input);

      // 2️⃣ Optionally validate creator exists
      await this.userRepo.findByIdOrThrow(createdBy);

      // 3️⃣ Ensure role name is not taken
      await this.roleValidator.validateUniqueName(name);

      // 4️⃣ Build role document
      const role = this.docBuilder.build({ name: name.trim(), permissions, createdBy });

      // 5️⃣ Persist
      const createdRole = await this.roleRepo.create(role, { session });

      if (!createdRole) {
        throw ApiError.internalError('Failed to create role');
      }

      return { success: true, role: createdRole };
    });
  }

  // Update role metadata (name / permissions)
  async updateRole(input: IRoleUpdateInput): Promise<IRole> {
    return await withTransaction('Updating role', async (session) => {
      const { roleId, name, permissions, updatedBy } = input;

      // 1️⃣ Validate input
      await this.inputValidator.validate(input);

      // 2️⃣ Validate updater exists
      await this.userRepo.findByIdOrThrow(updatedBy);

      // 3️⃣ Validate role exists
      const role = await this.roleValidator.validateById(roleId);

      const updatePayload: Partial<IRole> = {};
      if (typeof name === 'string') updatePayload.name = name.trim();
      if (Array.isArray(permissions)) updatePayload.permissions = permissions;

      const updatedRole = await this.roleRepo.updateById(roleId, updatePayload, {
        new: true,
        session,
      });

      if (!updatedRole) {
        throw ApiError.internalError('Failed to update role');
      }

      return updatedRole;
    });
  }

  // Assign a role to a user
  async assignRoleToUser(input: IRoleAssignInput): Promise<void> {
    return await withTransaction('Assigning role to user', async (session) => {
      const { roleId, userId, assignedBy } = input;

      // 1️⃣ Validate input
      await this.inputValidator.validate(input);

      // 2️⃣ Basic validations
      const role = await this.roleValidator.validateById(roleId);
      const user = await this.userRepo.findByIdOrThrow(userId);
      await this.userRepo.findByIdOrThrow(assignedBy);

      // 3️⃣ Prevent duplicate assignment
      const alreadyHas = await this.roleRepo.userHasRole(userId, roleId);
      if (alreadyHas) return;

      // 4️⃣ Assign
      await this.roleRepo.assignRoleToUser(userId, roleId, { session });
    });
  }

  // Revoke a role from a user
  async revokeRoleFromUser(input: IRoleAssignInput): Promise<void> {
    return await withTransaction('Revoking role from user', async (session) => {
      const { roleId, userId, assignedBy } = input;

      // 1️⃣ Validate input
      await this.inputValidator.validate(input);

      // 2️⃣ Basic validations
      await this.roleValidator.validateById(roleId);
      await this.userRepo.findByIdOrThrow(userId);
      await this.userRepo.findByIdOrThrow(assignedBy);

      // 3️⃣ Remove assignment if exists
      await this.roleRepo.revokeRoleFromUser(userId, roleId, { session });
    });
  }

  // Delete role (soft-delete or hard-delete depending on repo implementation)
  async deleteRole(roleId: string, performedBy: string): Promise<void> {
    return await withTransaction('Deleting role', async (session) => {
      // Validate performer
      await this.userRepo.findByIdOrThrow(performedBy);

      // Validate role exists
      await this.roleValidator.validateById(roleId);

      const deleted = await this.roleRepo.deleteById(roleId, { session });
      if (!deleted) throw ApiError.internalError('Failed to delete role');
    });
  }
}

export const roleManagementService = new RoleManagementService();
