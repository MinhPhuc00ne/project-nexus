import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Roles } from '../../../core/security/roles.decorator';

import { CategoryService } from '../../catalog/services/category.service';
import { CreateCategoryDto } from '../../catalog/dtos/create-category.dto';
import { UpdateCategoryDto } from '../../catalog/dtos/update-category.dto';

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
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.createCategory(dto);
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
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, dto);
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
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }
}
