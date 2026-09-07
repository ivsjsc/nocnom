import { useEffect, useState, type ChangeEvent } from 'react';
import { mockDb, Timetable, DayMenu, Dish } from '../lib/db';
import { Save, CheckCircle2, ChevronDown, Plus, Minus, Search, X, Download, Upload, Database } from 'lucide-react';

const parseCsvLine = (line: string) => {
  const fields: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      fields.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }
  fields.push(value.trim());
  return fields;
};

const escapeCsvCell = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`;

export default function AdminPanel() {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("mon");
  const [editingMenu, setEditingMenu] = useState<DayMenu | null>(null);
  const [saved, setSaved] = useState(false);
  
  // Modal state
  const [selectingCombo, setSelectingCombo] = useState<'A'|'B'|'C' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const daysOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const comboLabels = { A: 'Chuẩn', B: 'Nhanh', C: 'Healthy' };
  const comboColors = { 
    A: 'text-blue-700 bg-blue-50 border-blue-200', 
    B: 'text-orange-700 bg-orange-50 border-orange-200', 
    C: 'text-green-700 bg-green-50 border-green-200' 
  };

  useEffect(() => {
    const data = mockDb.getAll();
    setTimetable(data);
    setEditingMenu(JSON.parse(JSON.stringify(data[selectedDay])));
    
    const unsub = mockDb.subscribeDishes(setDishes);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (timetable) {
      setEditingMenu(JSON.parse(JSON.stringify(timetable[selectedDay])));
      setSaved(false);
    }
  }, [selectedDay, timetable]);

  const handleSave = () => {
    if (editingMenu) {
      mockDb.updateDoc(selectedDay, editingMenu);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const downloadTextFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadCsvTemplate = () => {
    const templateContent = 'Ngày,Combo,Món ăn,Số lượng\nThứ 2,Combo A,Cơm gà xối mỡ,50\nThứ 2,Combo B,Phở bò,30\nThứ 2,Combo C,Wrap gà + Trái cây,20\nThứ 3,Combo A,Cơm sườn + Salad,50\nThứ 3,Combo B,Bún riêu chả,30\nThứ 3,Combo C,Cơm chay,20\nThứ 4,Combo A,Cơm thịt kho,50\nThứ 4,Combo B,Mì xào hải sản,30\nThứ 4,Combo C,Salad gạo lứt,20\nThứ 5,Combo A,Cơm cá kho,50\nThứ 5,Combo B,Bún mắm cá,30\nThứ 5,Combo C,Sandwich + Sữa chua,20\nThứ 6,Combo A,Cơm bò xào,50\nThứ 6,Combo B,Mì Quảng,30\nThứ 6,Combo C,Cơm ngũ cốc,20\nThứ 7,Combo A,Cơm tấm,50\nThứ 7,Combo B,Bún xào,30\nThứ 7,Combo C,Snack box,20\nChủ Nhật,Combo A,Cơm thịt nướng,50\nChủ Nhật,Combo B,Lẩu mini,30\nChủ Nhật,Combo C,Bánh mì + Sữa,20';
    downloadTextFile('\uFEFF' + templateContent, 'mau_thuc_don_tuan.csv', 'text/csv;charset=utf-8;');
  };

  const exportToCsv = () => {
    const allData = mockDb.getAll();
    const currentDishes = mockDb.getDishesSync();
    const rows = ['Ngày,Combo,Món ăn,Số lượng'];

    daysOrder.forEach(day => {
      const menu = allData[day];
      (['A', 'B', 'C'] as const).forEach(combo => {
        const dish = currentDishes.find(d => d.id === menu.options[combo].dishId);
        rows.push([
          escapeCsvCell(menu.dayName),
          escapeCsvCell(`Combo ${combo}`),
          escapeCsvCell(dish?.name ?? 'Chưa chọn'),
          escapeCsvCell(menu.options[combo].stock)
        ].join(','));
      });
    });

    downloadTextFile('\uFEFF' + rows.join('\n'), 'thuc_don_tuan.csv', 'text/csv;charset=utf-8;');
  };

  const backupToJson = () => {
    const allData = {
      timetable: mockDb.getAll(),
      dishes: mockDb.getDishesSync(),
      categories: mockDb.getCategoriesSync()
    };
    downloadTextFile(
      JSON.stringify(allData, null, 2),
      'backup_data.json',
      'application/json;charset=utf-8;'
    );
  };

  const restoreFromJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const isValid =
          data &&
          typeof data.timetable === 'object' &&
          Array.isArray(data.dishes) &&
          Array.isArray(data.categories);

        if (!isValid) {
          alert('Lỗi: File JSON không đúng cấu trúc dữ liệu nOcnOm.');
          return;
        }

        if (window.confirm('Bạn có chắc muốn khôi phục dữ liệu? Dữ liệu hiện tại sẽ bị ghi đè.')) {
          mockDb.restoreData(data);
          window.location.reload();
        }
      } catch {
        alert('Lỗi: File JSON không hợp lệ');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const importFromCsv = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = String(e.target?.result ?? '').replace(/^\uFEFF/, '');
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
          alert('File CSV không có dữ liệu.');
          return;
        }

        const header = parseCsvLine(lines[0]).map(value => value.toLowerCase());
        const expectedHeader = ['ngày', 'combo', 'món ăn', 'số lượng'];
        if (header.length < 4 || !expectedHeader.every((value, index) => header[index] === value)) {
          alert('File CSV không đúng định dạng. Vui lòng sử dụng file mẫu.');
          return;
        }

        const nextTimetable = JSON.parse(JSON.stringify(mockDb.getAll())) as Timetable;
        const currentDishes = mockDb.getDishesSync();
        let updated = 0;
        let skipped = 0;

        for (let i = 1; i < lines.length; i++) {
          const [dayName, comboText, dishName, stockText] = parseCsvLine(lines[i]);
          const dayKey = daysOrder.find(
            key => nextTimetable[key].dayName.toLocaleLowerCase('vi-VN') === dayName?.toLocaleLowerCase('vi-VN')
          );
          const comboMatch = comboText?.match(/(?:combo\s*)?([abc])$/i);
          const combo = comboMatch?.[1]?.toUpperCase() as 'A' | 'B' | 'C' | undefined;
          const dish = currentDishes.find(
            item => item.name.toLocaleLowerCase('vi-VN') === dishName?.toLocaleLowerCase('vi-VN')
          );
          const stock = Number.parseInt(stockText, 10);

          if (!dayKey || !combo || !dish || !Number.isFinite(stock) || stock < 0) {
            skipped++;
            continue;
          }

          nextTimetable[dayKey].options[combo] = {
            dishId: dish.id,
            stock
          };
          updated++;
        }

        if (updated === 0) {
          alert('Không có dòng hợp lệ để cập nhật.');
          return;
        }

        daysOrder.forEach(day => mockDb.updateDoc(day, nextTimetable[day]));
        setTimetable(JSON.parse(JSON.stringify(nextTimetable)));
        setEditingMenu(JSON.parse(JSON.stringify(nextTimetable[selectedDay])));
        setSaved(false);

        alert(
          skipped > 0
            ? `Đã nhập ${updated} dòng. Bỏ qua ${skipped} dòng không hợp lệ hoặc không tìm thấy món.`
            : `Đã nhập thành công ${updated} dòng thực đơn.`
        );
      } catch {
        alert('Không thể đọc file CSV. Vui lòng kiểm tra định dạng và thử lại.');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleChange = (combo: 'A'|'B'|'C', field: 'dishId'|'stock', value: string | number) => {
    if (!editingMenu) return;
    setEditingMenu({
      ...editingMenu,
      options: {
        ...editingMenu.options,
        [combo]: {
          ...editingMenu.options[combo],
          [field]: field === 'dishId' ? value : Math.max(0, Number(value))
        }
      }
    });
  };

  const getDish = (dishId: string) => dishes.find(d => d.id === dishId);

  const filteredDishes = dishes.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!editingMenu || dishes.length === 0) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 sm:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">
            Quản lý thực đơn
          </h2>
          <p className="text-stone-500 text-sm">Gán món ăn cho từng ngày trong tuần.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadCsvTemplate}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Tải mẫu CSV
          </button>
          
          <button
            onClick={exportToCsv}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Xuất CSV
          </button>
          
          <label className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            Nhập CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={importFromCsv}
              className="hidden"
            />
          </label>
          
          <button
            onClick={backupToJson}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
          >
            <Database className="w-4 h-4" />
            Sao lưu JSON
          </button>
          
          <label className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm cursor-pointer">
            <Database className="w-4 h-4" />
            Khôi phục JSON
            <input
              type="file"
              accept=".json"
              onChange={restoreFromJson}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar: Day Selector */}
        <div className="lg:w-64 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
          {daysOrder.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-3 rounded-xl text-left font-medium transition-all flex items-center justify-between whitespace-nowrap lg:whitespace-normal shrink-0 ${
                selectedDay === day 
                  ? 'bg-stone-900 text-white shadow-md' 
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
              }`}
            >
              <span>{timetable?.[day].dayName}</span>
              {selectedDay === day && <div className="hidden lg:block w-2 h-2 rounded-full bg-emerald-400" />}
            </button>
          ))}
        </div>

        {/* Right Content: Editor */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/50">
            <h3 className="text-lg font-bold text-stone-800">
              Thực đơn {editingMenu.dayName}
            </h3>
            <button
              onClick={handleSave}
              className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                saved 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow'
              }`}
            >
              {saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
              {saved ? 'Đã lưu' : 'Lưu thay đổi'}
            </button>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            {(['A', 'B', 'C'] as const).map(combo => {
              const currentDish = getDish(editingMenu.options[combo].dishId);
              const stock = editingMenu.options[combo].stock;
              
              return (
                <div key={combo} className="flex flex-col bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden">
                  <div className={`px-4 py-3 border-b flex items-center justify-between ${comboColors[combo].replace('text-', 'bg-').replace('50', '100/50').split(' ')[1]}`}>
                    <span className={`font-bold text-sm uppercase tracking-wider ${comboColors[combo].split(' ')[0]}`}>
                      Combo {combo}
                    </span>
                    <span className="text-xs font-medium text-stone-500 bg-white/60 px-2 py-1 rounded-md">
                      {comboLabels[combo]}
                    </span>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col gap-4">
                    {/* Dish Selector */}
                    <div className="space-y-2 flex-1">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Món ăn</label>
                      <button 
                        onClick={() => setSelectingCombo(combo)}
                        className="w-full text-left bg-white border border-stone-200 hover:border-emerald-400 rounded-xl p-3 transition-colors group flex items-center justify-between shadow-sm"
                      >
                        {currentDish ? (
                          <div className="flex items-center gap-3 overflow-hidden">
                            {currentDish.imageUrl ? (
                              <img src={currentDish.imageUrl} alt={currentDish.name} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-stone-100" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-[10px] text-stone-400 shrink-0">No img</div>
                            )}
                            <span className="font-medium text-stone-800 truncate">{currentDish.name}</span>
                          </div>
                        ) : (
                          <span className="text-stone-400">Chọn món...</span>
                        )}
                        <ChevronDown className="w-4 h-4 text-stone-400 group-hover:text-emerald-500 shrink-0" />
                      </button>
                    </div>

                    {/* Stock Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Số lượng dự kiến</label>
                      <div className="flex items-center bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                        <button 
                          onClick={() => handleChange(combo, 'stock', stock - 1)}
                          className="p-3 text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input 
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={stock}
                          onChange={(e) => handleChange(combo, 'stock', e.target.value)}
                          className="w-full text-center font-bold text-stone-800 focus:outline-none"
                        />
                        <button 
                          onClick={() => handleChange(combo, 'stock', stock + 1)}
                          className="p-3 text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dish Selection Modal */}
      {selectingCombo && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b flex items-center justify-between bg-stone-50">
              <h3 className="font-bold text-stone-800">Chọn món cho Combo {selectingCombo}</h3>
              <button onClick={() => { setSelectingCombo(null); setSearchQuery(''); }} className="p-2 bg-stone-200 hover:bg-stone-300 rounded-full transition-colors">
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>
            
            <div className="p-4 border-b bg-white">
              <div className="relative">
                <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm món ăn..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all outline-none"
                />
              </div>
            </div>

            <div className="p-2 overflow-y-auto flex-1">
              {filteredDishes.length === 0 ? (
                <div className="p-8 text-center text-stone-500">Không tìm thấy món ăn nào.</div>
              ) : (
                <div className="space-y-1">
                  {filteredDishes.map(d => (
                    <button 
                      key={d.id}
                      onClick={() => {
                        handleChange(selectingCombo, 'dishId', d.id);
                        setSelectingCombo(null);
                        setSearchQuery('');
                      }}
                      className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${
                        editingMenu.options[selectingCombo].dishId === d.id 
                          ? 'bg-emerald-50 border border-emerald-200' 
                          : 'hover:bg-stone-100 border border-transparent'
                      }`}
                    >
                      {d.imageUrl ? (
                        <img src={d.imageUrl} alt={d.name} className="w-12 h-12 rounded-lg object-cover border border-stone-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-stone-200 flex items-center justify-center text-stone-400 text-[10px]">No img</div>
                      )}
                      <div className="flex-1">
                        <div className={`font-medium ${editingMenu.options[selectingCombo].dishId === d.id ? 'text-emerald-900' : 'text-stone-900'}`}>
                          {d.name}
                        </div>
                        <div className="text-xs text-stone-500">{d.vendors.length} quán phục vụ</div>
                      </div>
                      {editingMenu.options[selectingCombo].dishId === d.id && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
