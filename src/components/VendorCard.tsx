import React, { useState } from 'react';
import { Vendor, mockDb } from '../lib/db';
import { getSafeExternalUrl } from '../lib/url';
import { normalizePriceVnd } from '../domain/menu/vendorOffer';
import { Phone, MapPin, Tag, Info, Plus, Store, ChevronUp, ShoppingBag, Pencil } from 'lucide-react';

export default function VendorCard({
  vendor,
  dishId,
  showOrderButton = false,
  canManage = false
}: {
  vendor: Vendor;
  dishId: string;
  showOrderButton?: boolean;
  canManage?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleAddExtraInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    const label = window.prompt("Nhập tên thông tin (VD: Giờ mở cửa, Ghi chú, Link đặt hàng...):");
    if (!label) return;
    const value = window.prompt(`Nhập nội dung cho "${label}":`);
    if (!value) return;
    mockDb.addVendorExtraInfo(dishId, vendor.id, { id: Date.now().toString(), label, value });
    setExpanded(true);
  };

  const handleEditVendor = (e: React.MouseEvent, field: keyof Vendor, label: string) => {
    e.stopPropagation();
    const currentValue = vendor[field];
    const newValue = window.prompt(`Nhập ${label} mới:`, String(currentValue));
    if (newValue !== null && newValue !== String(currentValue)) {
      if (field === 'price') {
        const price = normalizePriceVnd(Number(newValue));
        if (price === null) {
          window.alert('Giá phải là số nguyên VND hợp lệ.');
          return;
        }
        mockDb.updateVendor(dishId, vendor.id, { price });
        return;
      }

      mockDb.updateVendor(dishId, vendor.id, { [field]: newValue });
    }
  };

  const handleEditExtraInfo = (e: React.MouseEvent, infoId: string, currentLabel: string, currentValue: string) => {
    e.stopPropagation();
    const newValue = window.prompt(`Nhập nội dung mới cho "${currentLabel}" (Để trống để xóa):`, currentValue);
    if (newValue !== null && newValue !== currentValue) {
      if (newValue.trim() === '') {
         if(window.confirm(`Xóa thông tin "${currentLabel}"?`)) {
             mockDb.deleteVendorExtraInfo(dishId, vendor.id, infoId);
         }
      } else {
         mockDb.updateVendorExtraInfo(dishId, vendor.id, infoId, newValue);
      }
    }
  };

  const safeLink = getSafeExternalUrl(vendor.link);

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden transition-all group/card">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-stone-100 transition-colors"
      >
        <div className="flex items-center gap-2 font-bold text-stone-800">
          <Store className="w-4 h-4 text-emerald-600" />
          <span className="truncate max-w-[140px] sm:max-w-[200px] text-left">{vendor.name}</span>
          {canManage && !showOrderButton && (
            <div 
              onClick={(e) => handleEditVendor(e, 'name', 'Tên quán')}
              className="p-1 text-stone-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-stone-500 shrink-0">
          <span className="text-sm font-medium text-emerald-600">{vendor.price.toLocaleString('vi-VN')}đ</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </div>
      </button>
      
      {expanded && (
        <div className="p-3 pt-0 border-t border-stone-100 mt-1 space-y-2 text-sm text-stone-600 bg-white">
          <div className="flex items-center gap-2 mt-2 group/item">
            <Tag className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="font-medium text-emerald-600">Giá: {vendor.price.toLocaleString('vi-VN')}đ</span>
            {canManage && !showOrderButton && (
              <button onClick={(e) => handleEditVendor(e, 'price', 'Giá')} className="p-1 ml-auto text-stone-300 hover:text-emerald-600 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity">
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 group/item">
            <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">SĐT: {vendor.phone}</span>
            {canManage && !showOrderButton && (
              <button onClick={(e) => handleEditVendor(e, 'phone', 'Số điện thoại')} className="p-1 ml-auto text-stone-300 hover:text-emerald-600 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity">
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-start gap-2 group/item">
            <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
            <span className="flex-1">Địa chỉ: {vendor.address}</span>
            {canManage && !showOrderButton && (
              <button onClick={(e) => handleEditVendor(e, 'address', 'Địa chỉ')} className="p-1 ml-auto text-stone-300 hover:text-emerald-600 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity">
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 group/item">
            <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate flex-1">Link: {safeLink ? <a href={safeLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Xem link</a> : vendor.link ? 'Link không hợp lệ' : 'Chưa có'}</span>
            {canManage && !showOrderButton && (
              <button onClick={(e) => handleEditVendor(e, 'link', 'Link tham khảo')} className="p-1 ml-auto text-stone-300 hover:text-emerald-600 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity">
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          {vendor.extraInfo?.map(info => (
            <div key={info.id} className="flex items-start gap-2 group/item">
              <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
              <span className="flex-1"><strong className="font-medium text-stone-700">{info.label}:</strong> {info.value}</span>
              {canManage && !showOrderButton && (
                <button onClick={(e) => handleEditExtraInfo(e, info.id, info.label, info.value)} className="p-1 ml-auto text-stone-300 hover:text-emerald-600 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity">
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          
          <div className="flex gap-2 mt-3 pt-2 border-t border-stone-50">
            {canManage && !showOrderButton && (
              <button 
                onClick={handleAddExtraInfo}
                className="flex-1 py-1.5 flex items-center justify-center gap-1 text-xs font-medium text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-dashed border-stone-300 hover:border-emerald-300"
              >
                <Plus className="w-3 h-3" />
                Thêm thông tin
              </button>
            )}
            {showOrderButton && (
              <button 
                onClick={() => alert(`Đã đặt món tại ${vendor.name}`)}
                className="flex-1 py-1.5 flex items-center justify-center gap-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                <ShoppingBag className="w-3 h-3" />
                Đặt quán này
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
