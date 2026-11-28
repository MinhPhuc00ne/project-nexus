import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam } from '@nexus/contracts/nest';
import { Role, UuidParamSchema } from '@nexus/contracts';
import { Public, RequirePrivilege, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { CategoryService, CategoryTreeItem } from '../services/category.service';
import { CreateCategoryInput, CreateCategorySchema } from '../dtos/create-category.dto';
import { UpdateCategoryInput, UpdateCategorySchema } from '../dtos/update-category.dto';

@ApiTags('7. CATALOG')
@Controller('catalog/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[CATALOG] Get the product category hierarchy (up to 3 levels)',
    description:
      'Returns the nested category tree for search filters and seller product creation forms.',
  })
  @ApiResponse({ status: 200, description: 'Category tree retrieved successfully' })
  async getCategories(): Promise<CategoryTreeItem[]> {
    return this.categoryService.getCategoryTree();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @RequirePrivilege('CATEGORY.MANAGE')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[ADMIN] Create a product category (up to 3 levels)',
    description:
      'Admin-only endpoint to create a root category (level 1) or child category via parentId.',
  })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Exceeds 3-level hierarchy limit or invalid input',
  })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  async createCategory(@ZodBody(CreateCategorySchema) dto: CreateCategoryInput) {
    return this.categoryService.createCategory(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @RequirePrivilege('CATEGORY.MANAGE')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN] Update or re-parent a category',
    description:
      'Updates category name, slug, or parentId and automatically recalculates hierarchy levels.',
  })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 400, description: 'Cycle detected or exceeds 3-level hierarchy limit' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(UpdateCategorySchema) dto: UpdateCategoryInput,
  ) {
    return this.categoryService.updateCategory(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @RequirePrivilege('CATEGORY.MANAGE')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN] Delete a product category',
    description: 'Permitted only when the category has no child categories and no linked products.',
  })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Category still contains subcategories or linked products',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(@ZodParam('id', UuidParamSchema) id: string) {
    return this.categoryService.deleteCategory(id);
  }
}
