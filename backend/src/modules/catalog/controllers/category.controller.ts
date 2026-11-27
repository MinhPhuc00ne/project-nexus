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
    summary: '[CATALOG] Lấy cây phân cấp danh mục sản phẩm (Tối đa 3 cấp)',
    description:
      'Trả về danh sách danh mục phân cấp (Cha - Con - Cháu) phục vụ menu tìm kiếm và form đăng bán sản phẩm của Seller.',
  })
  @ApiResponse({ status: 200, description: 'Lấy cây danh mục thành công' })
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
    summary: '[ADMIN] Tạo mới danh mục hàng hóa (tối đa 3 cấp)',
    description:
      'Chỉ Admin có quyền tạo danh mục mới. Hỗ trợ tạo danh mục gốc (level 1) hoặc danh mục con (truyền parentId của cha).',
  })
  @ApiResponse({ status: 201, description: 'Tạo danh mục thành công' })
  @ApiResponse({
    status: 400,
    description: 'Vượt quá giới hạn 3 tầng danh mục hoặc dữ liệu không hợp lệ',
  })
  @ApiResponse({ status: 409, description: 'Tên danh mục đã tồn tại' })
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
    summary: '[ADMIN] Cập nhật danh mục hoặc điều chuyển danh mục cha (re-parenting)',
    description:
      'Admin chỉnh sửa tên, slug hoặc dời danh mục sang danh mục cha khác (parentId). Hệ thống tự động tính toán lại cấp độ level.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật danh mục thành công' })
  @ApiResponse({ status: 400, description: 'Không thể chuyển vì gây vòng lặp hoặc vượt quá 3 cấp' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
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
    summary: '[ADMIN] Xóa danh mục hàng hóa',
    description:
      'Chỉ được xóa danh mục khi không chứa danh mục con và không có sản phẩm nào đang liên kết.',
  })
  @ApiResponse({ status: 200, description: 'Xóa danh mục thành công' })
  @ApiResponse({
    status: 400,
    description: 'Danh mục đang có danh mục con hoặc còn sản phẩm liên kết',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  async deleteCategory(@ZodParam('id', UuidParamSchema) id: string) {
    return this.categoryService.deleteCategory(id);
  }
}
