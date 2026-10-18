import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

export default function AdminCategoriesPage() {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>Danh mục hàng hóa</CardTitle>
        <CardDescription>
          Quản lý cây danh mục đa cấp (lên tới 3 cấp) và ánh xạ mô hình 3D cho danh mục. Chức năng
          đang được phát triển.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
