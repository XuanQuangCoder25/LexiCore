import { toast } from "sonner";

export interface InvoiceTransaction {
  id: string;
  date: string;
  description: string;
  amountVnd: number;
  status: "SUCCESS" | "PENDING" | "FAILED";
  paymentMethod?: string;
}

export interface CustomerInfo {
  name?: string;
  email?: string;
}

// Format tiền tệ VNĐ chuẩn
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Tải hóa đơn bản sao lưu dạng .txt
 */
export function exportInvoiceToTxt(txn: InvoiceTransaction): void {
  const content = [
    "============================================================",
    "               HOÁ ĐƠN ĐIỆN TỬ - LEXICORE",
    "           Smart AI English Learning Platform",
    "============================================================",
    `Mã hoá đơn:       Invoice_${txn.id}`,
    `Mã tham chiếu:    ${txn.id}`,
    `Ngày giao dịch:   ${txn.date}`,
    `Dịch vụ:          ${txn.description}`,
    `Số tiền:          ${formatVND(txn.amountVnd)}`,
    `Trạng thái:       ${txn.status === "SUCCESS" ? "Thành công (PAID)" : txn.status === "PENDING" ? "Dang xu ly" : "That bai"}`,
    `Hình thức:        ${txn.paymentMethod || "VietQR / Ví LexiCore"}`,
    "------------------------------------------------------------",
    "Đơn vị cung cấp:  CÔNG TY CỔ PHẦN CÔNG NGHỆ LEXICORE",
    "Địa chỉ:          LexiCore Tower, phường Tân Hưng, TP. HCM",
    "Email hỗ trợ:     support@lexicore.site",
    "Hotline:          52300055 52300044",
    "Website:          https://lexicore.site",
    "============================================================",
    "Cảm ơn bạn đã sử dụng dịch vụ của LexiCore!",
    "Chúc bạn có những giờ phút học tập hiệu quả và thành công.",
    "============================================================",
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice_${txn.id}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Chuyển đổi logo sang base64 data URL để html2canvas vẽ tức thì mà không lo delay hay CORS
 */
async function getLogoBase64(): Promise<string> {
  try {
    // Dùng favicon_whale.png (256x256, ~50KB)
    const res = await fetch("/assets/favicon_whale.png");
    if (!res.ok) return "";
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || "");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

/**
 * Tạo và tải hóa đơn chuẩn PDF (Invoice_<order_id>.pdf)
 * Dùng dynamic import để chỉ tải thư viện khi người dùng thực sự bấm xuất PDF
 */
export async function exportInvoiceToPdf(
  txn: InvoiceTransaction,
  customerInfo?: CustomerInfo
): Promise<void> {
  // Dynamic import on demand và Lấy base64 của logo thật
  const [jspdfModule, html2canvasModule, logoDataUrl] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
    getLogoBase64(),
  ]);

  const jsPDF = jspdfModule.jsPDF || (jspdfModule as any).default || jspdfModule;
  const html2canvas = html2canvasModule.default || html2canvasModule;

  // Tạo container tạm thời trong DOM để render mẫu hóa đơn HTML
  const container = document.createElement("div");
  container.id = `lexicore-invoice-${txn.id}`;
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "794px"; // Chuẩn khổ A4 (96 DPI)
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#0f172a";
  container.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  container.style.boxSizing = "border-box";
  container.style.zIndex = "-999";

  const customerName = customerInfo?.name || "Học viên LexiCore";
  const customerEmail = customerInfo?.email || "hocvien@lexicore.site";
  const stampText =
    txn.status === "FAILED" ? "FAILED" : txn.status === "PENDING" ? "PENDING" : "PAID";

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="LexiCore Logo" style="width: 48px; height: 48px; object-fit: contain; border-radius: 10px; display: block;" />`
    : `<div style="width: 48px; height: 48px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 20px; letter-spacing: -0.5px;">LC</div>`;

  container.innerHTML = `
    <div style="padding: 40px; background-color: #ffffff; color: #0f172a; line-height: 1.5; font-size: 13px;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #2563eb;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${logoHtml}
          <div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; text-transform: uppercase;">
              LEXICORE
            </h1>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-weight: 500;">
              Nền tảng học tiếng Anh thông minh bằng AI
            </p>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">
            HÓA ĐƠN ĐIỆN TỬ
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            ELECTRONIC INVOICE
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 4px;">
            Mã hóa đơn: <span style="font-family: monospace; color: #2563eb;">Invoice_${txn.id}</span>
          </div>
          <div style="font-size: 11px; color: #64748b;">
            Ngày lập: ${txn.date}
          </div>
        </div>
      </div>

      <!-- Seller & Buyer Info Grid -->
      <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 24px; padding: 16px 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="flex: 1;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">
            Đơn vị cung cấp dịch vụ
          </div>
          <div style="font-weight: 700; font-size: 13px; color: #0f172a;">
            CÔNG TY CỔ PHẦN CÔNG NGHỆ LEXICORE
          </div>
          <div style="color: #475569; font-size: 11px; margin-top: 3px;">
            Mã số thuế: <strong>52300055_52300054</strong>
          </div>
          <div style="color: #475569; font-size: 11px; margin-top: 2px;">
            Địa chỉ: LexiCore Tower, phường Tân Hưng, TP. HCM
          </div>
          <div style="color: #475569; font-size: 11px; margin-top: 2px;">
            Hotline: 52300055 52300044 | Email: support@lexicore.site
          </div>
        </div>

        <div style="flex: 1; border-left: 1px solid #e2e8f0; padding-left: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">
            Thông tin khách hàng
          </div>
          <div style="font-weight: 700; font-size: 13px; color: #0f172a;">
            ${customerName}
          </div>
          <div style="color: #475569; font-size: 11px; margin-top: 3px;">
            Email: ${customerEmail}
          </div>
          <div style="color: #475569; font-size: 11px; margin-top: 2px;">
            Mã giao dịch: <span style="font-family: monospace; font-weight: 600;">#${txn.id}</span>
          </div>
          <div style="color: #475569; font-size: 11px; margin-top: 2px;">
            Phương thức: Chuyển khoản QR (SePay) / Ví LexiCore
          </div>
        </div>
      </div>

      <!-- Line items table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 28px; text-align: left;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff;">
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 700; border-radius: 6px 0 0 0; width: 40px; text-align: center;">STT</th>
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 700;">Tên dịch vụ / Gói sản phẩm</th>
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 700; text-align: center; width: 60px;">ĐVT</th>
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 700; text-align: center; width: 60px;">Số lượng</th>
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 700; text-align: right; width: 130px;">Đơn giá</th>
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 700; text-align: right; width: 140px; border-radius: 0 6px 0 0;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 14px; text-align: center; color: #64748b; font-weight: 600;">01</td>
            <td style="padding: 14px;">
              <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${txn.description}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Kích hoạt tài khoản học tập trên nền tảng LexiCore</div>
            </td>
            <td style="padding: 14px; text-align: center; color: #475569;">Gói</td>
            <td style="padding: 14px; text-align: center; font-weight: 600; color: #0f172a;">1</td>
            <td style="padding: 14px; text-align: right; color: #475569;">${formatVND(txn.amountVnd)}</td>
            <td style="padding: 14px; text-align: right; font-weight: 700; color: #0f172a;">${formatVND(txn.amountVnd)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Summary calculations -->
      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <div style="width: 320px;">
          <div style="display: flex; justify-content: space-between; padding: 6px 0; color: #475569; font-size: 12px;">
            <span>Cộng tiền dịch vụ:</span>
            <span style="font-weight: 600; color: #0f172a;">${formatVND(txn.amountVnd)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; color: #475569; font-size: 12px; border-bottom: 1px solid #e2e8f0;">
            <span>Thuế suất GTGT (0%):</span>
            <span style="font-weight: 600; color: #0f172a;">0 ₫</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; color: #0f172a; font-size: 14px; font-weight: 800;">
            <span>TỔNG TIỀN THANH TOÁN:</span>
            <span style="color: #2563eb; font-size: 17px;">${formatVND(txn.amountVnd)}</span>
          </div>
        </div>
      </div>

      <!-- Verification & Signature Section -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; padding-top: 24px; border-top: 1px dashed #cbd5e1;">
        <!-- Left: Legal notes -->
        <div style="max-width: 420px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <div style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase;">
              Hóa đơn điện tử hợp lệ
            </div>
          </div>
          <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
            Hóa đơn được khởi tạo và lưu trữ an toàn dưới dạng điện tử theo quy định tại Nghị định 123/2020/NĐ-CP của Chính phủ. Tra cứu và quản lý lịch sử đơn hàng tại tài khoản học viên trên <span style="color: #2563eb; font-weight: 600;">lexicore.site</span> (Mục Gói Hội viên &gt; Lịch sử giao dịch) với mã đơn <strong>${txn.id}</strong>.
          </p>
        </div>

        <!-- Right: Official PAID Stamp -->
        <div style="text-align: center;">
          <div style="display: inline-block; border: 2.5px solid #059669; border-radius: 6px; padding: 3px; background-color: #ecfdf5; transform: rotate(-3deg);">
            <div style="border: 1px solid #059669; border-radius: 4px; padding: 6px 16px; text-align: center;">
              <div style="font-size: 16px; font-weight: 900; color: #059669; letter-spacing: 2px; text-transform: uppercase; line-height: 1;">
                ${stampText}
              </div>
              <div style="font-size: 8px; font-weight: 800; color: #047857; margin-top: 3px; letter-spacing: 0.8px; text-transform: uppercase;">
                LEXICORE PAYMENT SYSTEM
              </div>
            </div>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 6px; font-weight: 500;">
            Ký số bởi: CÔNG TY CP CÔNG NGHỆ LEXICORE
          </div>
        </div>
      </div>

      <!-- Bottom footer bar -->
      <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
        Cảm ơn bạn đã tin tưởng và đồng hành cùng LexiCore trên hành trình chinh phục tiếng Anh!
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Đợi 60ms để DOM được render đầy đủ font và styles
    await new Promise((resolve) => setTimeout(resolve, 60));

    const canvas = await html2canvas(container, {
      scale: 2, // Tăng gấp đôi độ phân giải để chữ sắc nét tuyệt đối
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = 210; // Chiều rộng A4 (mm)
    const pdfHeight = 297; // Chiều cao A4 (mm)
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight));
    pdf.save(`Invoice_${txn.id}.pdf`);
  } finally {
    // Luôn dọn dẹp DOM container sau khi hoàn tất hoặc khi có lỗi
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Hàm điều phối tải hóa đơn:
 * Ưu tiên xuất file PDF chuẩn đẹp (99.9% trường hợp).
 * Chỉ khi nào xảy ra lỗi bất khả kháng thì mới tự động chuyển sang tải file .txt sao lưu.
 */
export async function downloadInvoiceWithFallback(
  txn: InvoiceTransaction,
  customerInfo?: CustomerInfo
): Promise<void> {
  try {
    await exportInvoiceToPdf(txn, customerInfo);
    toast.success(`Đã tải hóa đơn Invoice_${txn.id}.pdf thành công!`);
  } catch (error) {
    console.error("Lỗi khi xuất hóa đơn PDF:", error);
    toast.warning(
      "Thiết bị không thể xuất định dạng PDF. Hệ thống đang tự động tải về bản sao lưu văn bản (.txt)..."
    );
    // Kích hoạt ngay bản sao lưu .txt
    exportInvoiceToTxt(txn);
  }
}
