import React from 'react';
import { Bell } from 'lucide-react';
import type { NotificationItem } from './HomeHeader';

interface NotificationDropdownProps {
  isOpen: boolean;
  notifications: NotificationItem[];
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  notifications,
}) => {
  if (!isOpen) return null;

  return (
    <div className="animate-home-popover-enter motion-reduce:animate-none absolute right-0 top-[calc(100%+6px)] z-[1100] w-[360px] overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_16px_40px_rgb(20_34_62_/_14%)]">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h4 className="m-0 text-sm font-bold text-slate-800">Thông báo</h4>
      </div>

      <div className="max-h-[280px] overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`flex gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50 ${
                item.unread ? 'bg-orange-50/60' : ''
              }`}
            >
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[#1c3973]">
                <Bell size={16} />
              </div>

              <div>
                <h5 className="mb-1 text-[13px] font-semibold text-slate-800">{item.title}</h5>

                {item.desc && (
                  <p className="mb-1 text-xs leading-[1.4] text-slate-500">{item.desc}</p>
                )}

                {item.time && <span className="text-[11px] text-slate-400">{item.time}</span>}
              </div>
            </div>
          ))
        ) : (
          <div className="p-5 text-center text-[13px] text-slate-400">Không có thông báo mới</div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
