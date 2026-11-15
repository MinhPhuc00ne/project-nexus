import { useEffect, useRef, useState } from 'react';
import { saveAdminAuctionLotNoteApi } from '../../../services/auction.service';
import { Button } from '../shared/AdminUI';

export default function AuctionLotNote({
  itemId,
  note,
  onSaved,
}: {
  itemId: string;
  note?: string | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false);
  const busy = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return (
    <section className="space-y-2 border-t border-slate-100 pt-4" aria-label="Ghi chú hỗ trợ lô">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-slate-600">Ghi chú hỗ trợ</h3>
        {!editing && (
          <button
            type="button"
            className="text-xs font-semibold text-blue-600 hover:underline"
            onClick={() => {
              setError('');
              setEditing(true);
            }}
          >
            {note ? 'Chỉnh sửa' : 'Thêm ghi chú'}
          </button>
        )}
      </div>
      {!editing && (
        <p className="whitespace-pre-wrap break-words text-xs text-slate-500">
          {note || 'Chưa có ghi chú.'}
        </p>
      )}
      {editing && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy.current) return;
            const text = String(new FormData(event.currentTarget).get('staffNote') ?? '');
            busy.current = true;
            setSaving(true);
            setError('');
            void saveAdminAuctionLotNoteApi(itemId, text)
              .then(() => {
                if (active.current) {
                  setEditing(false);
                  onSaved();
                }
              })
              .catch((cause: unknown) => {
                if (active.current)
                  setError(cause instanceof Error ? cause.message : 'Không thể lưu ghi chú.');
              })
              .finally(() => {
                busy.current = false;
                if (active.current) setSaving(false);
              });
          }}
        >
          <label className="block text-xs">
            Nội dung ghi chú
            <textarea
              name="staffNote"
              maxLength={2000}
              rows={3}
              defaultValue={note ?? ''}
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-slate-200 p-3"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu ghi chú'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Hủy
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
