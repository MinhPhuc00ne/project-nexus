import BannerForm from '../../components/adminDashboard/Banners/BannerForm';
import BannerList from '../../components/adminDashboard/Banners/BannerList';
import { useBannerManagement } from '../../components/adminDashboard/Banners/useBannerManagement';

export default function AdminBannersPage() {
  const management = useBannerManagement();

  return (
    <div className="space-y-5">
      {management.editor && (
        <BannerForm
          id={management.editor.id}
          value={management.editor.value}
          saving={management.saving}
          formError={management.formError}
          onUpdate={management.update}
          submit={management.submit}
          onCancel={management.closeEditor}
        />
      )}
      <BannerList
        banners={management.banners}
        loading={management.loading}
        error={management.error}
        saving={management.saving}
        editing={!!management.editor}
        search={management.search}
        setSearch={management.setSearch}
        onRefresh={management.refresh}
        onEdit={management.openEditor}
        onToggle={management.toggle}
      />
    </div>
  );
}
