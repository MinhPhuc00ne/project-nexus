import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoryService, CategoryTreeItem } from '../services/category.service';
import { Public } from '../../../core/security/roles.decorator';

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
}
