import { UuidParamSchema } from '@nexus/contracts';
import { Controller, Delete, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam } from '@nexus/contracts/nest';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';

import { CategoryService } from '../../catalog/services/category.service';
import { CreateCategoryInput, CreateCategorySchema } from '../../catalog/dtos/create-category.dto';
import { UpdateCategoryInput, UpdateCategorySchema } from '../../catalog/dtos/update-category.dto';

/** The category tree every listing is filed under. */
@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminCategoriesController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create product catalog category',
    description:
      'Creates root level categories or nested subcategories up to three tiers deep using parentId.',
  })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Exceeds maximum taxonomy depth or invalid input' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  async createCategory(
    @CurrentUser('id') adminId: string,
    @ZodBody(CreateCategorySchema) dto: CreateCategoryInput,
  ) {
    return this.categoryService.createCategory(dto, adminId);
  }

  @Patch('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update catalog category attributes and hierarchy',
    description: 'Updates category name, slug, or moves category to a new parent node.',
  })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Circular hierarchy detected or taxonomy depth exceeded',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @CurrentUser('id') adminId: string,
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(UpdateCategorySchema) dto: UpdateCategoryInput,
  ) {
    return this.categoryService.updateCategory(id, dto, adminId);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete catalog category',
    description:
      'Removes empty categories that possess no child categories and no associated products.',
  })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Category contains active child categories or linked products',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(
    @CurrentUser('id') adminId: string,
    @ZodParam('id', UuidParamSchema) id: string,
  ) {
    return this.categoryService.deleteCategory(id, adminId);
  }
}
