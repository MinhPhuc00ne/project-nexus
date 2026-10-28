import { Injectable, Logger } from '@nestjs/common';

export interface OnlineStaffSession {
  staffId: string;
  socketIds: Set<string>;
  connectedAt: number;
  activeTickets: Set<string>;
}

@Injectable()
export class StaffQueueService {
  private readonly logger = new Logger(StaffQueueService.name);
  private readonly onlineStaff = new Map<string, OnlineStaffSession>();

  /**
   * Đăng ký nhân viên online khi kết nối WebSocket
   * Nếu nhân viên đã online (mở nhiều tab), giữ nguyên mốc thời gian connectedAt sớm nhất
   */
  registerOnlineStaff(staffId: string, socketId: string): void {
    const existing = this.onlineStaff.get(staffId);
    if (existing) {
      existing.socketIds.add(socketId);
      this.logger.log(
        `Staff ${staffId} kết nối thêm tab (socketId: ${socketId}). Tổng sockets: ${existing.socketIds.size}`,
      );
    } else {
      const now = Date.now();
      this.onlineStaff.set(staffId, {
        staffId,
        socketIds: new Set([socketId]),
        connectedAt: now,
        activeTickets: new Set(),
      });
      this.logger.log(`Staff ${staffId} đã ONLINE lúc ${new Date(now).toISOString()}`);
    }
  }

  /**
   * Hủy đăng ký socket khi nhân viên ngắt kết nối
   */
  unregisterStaff(staffId: string, socketId: string): void {
    const session = this.onlineStaff.get(staffId);
    if (!session) return;

    session.socketIds.delete(socketId);
    if (session.socketIds.size === 0) {
      this.onlineStaff.delete(staffId);
      this.logger.log(`Staff ${staffId} đã OFFLINE hoàn toàn khỏi hệ thống.`);
    } else {
      this.logger.log(
        `Staff ${staffId} đóng một kết nối socket. Còn lại: ${session.socketIds.size}`,
      );
    }
  }

  isStaffOnline(staffId: string): boolean {
    return this.onlineStaff.has(staffId);
  }

  getOnlineStaffCount(): number {
    return this.onlineStaff.size;
  }

  /**
   * Lấy danh sách nhân viên đang online sắp xếp theo thời điểm vào hệ thống sớm nhất (connectedAt ASC)
   */
  getOnlineStaffList(): Array<{ staffId: string; connectedAt: number; activeCount: number }> {
    return Array.from(this.onlineStaff.values())
      .map((s) => ({
        staffId: s.staffId,
        connectedAt: s.connectedAt,
        activeCount: s.activeTickets.size,
      }))
      .sort((a, b) => a.connectedAt - b.connectedAt);
  }

  /**
   * Tìm nhân viên trực tiếp theo để phân phối ticket:
   * 1. Phải đang ONLINE
   * 2. Số lượng ticket đang xử lý chưa vượt quá maxConcurrent (mặc định 5)
   * 3. Ưu tiên người vào hệ thống sớm nhất (FIFO: connectedAt nhỏ nhất)
   */
  getNextAvailableStaff(maxConcurrent = 5): string | null {
    const candidates = this.getOnlineStaffList().filter((s) => s.activeCount < maxConcurrent);

    if (candidates.length === 0) {
      return null;
    }

    return candidates[0].staffId;
  }

  /**
   * Ghi nhận một ticket đang được xử lý bởi nhân viên
   */
  trackAssignedTicket(staffId: string, conversationId: string): void {
    const session = this.onlineStaff.get(staffId);
    if (session) {
      session.activeTickets.add(conversationId);
    }
  }

  /**
   * Giải phóng ticket khi đã giải quyết xong (RESOLVED / CLOSED)
   */
  releaseAssignedTicket(staffId: string, conversationId: string): void {
    const session = this.onlineStaff.get(staffId);
    if (session) {
      session.activeTickets.delete(conversationId);
    }
  }

  /**
   * Đồng bộ lại danh sách ticket đang xử lý từ cơ sở dữ liệu
   */
  syncActiveTickets(staffId: string, conversationIds: string[]): void {
    const session = this.onlineStaff.get(staffId);
    if (session) {
      session.activeTickets = new Set(conversationIds);
    }
  }
}

