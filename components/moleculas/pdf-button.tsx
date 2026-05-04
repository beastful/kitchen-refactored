'use client';

import { useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import { store } from '@/store';
import { ModuleEntity } from '@/types';
import { Color } from 'three';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CATEGORY_ROOM } from '@/constants';
import { Loader, Printer, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const hinges = [
  { name: 'Нет' },
  { name: 'Да' },
  { name: 'Да' },
];

export function PDFExportButton() {
  const snap = useSnapshot(store);
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [progressStep, setProgressStep] = useState('');

  const modules = snap.modules.filter((m: ModuleEntity) => !m.tags.includes(CATEGORY_ROOM));
  const modulesTotal = modules.reduce((sum, m) => sum + m.price, 0);
  const tabletopArea = modules.reduce((area, m) => area + (m.size.z * m.size.x), 0);
  const tabletopPrice = Math.ceil(tabletopArea * snap.tabletop[2]);
  const grandTotal = modulesTotal + tabletopPrice;

  const handleExportPDF = async () => {
    if (!exportRef.current || isExporting) return;

    setIsExporting(true);
    try {
      setProgressStep('capture');
      await new Promise(r => setTimeout(r, 50));

      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });

      setProgressStep('generate');
      await new Promise(r => setTimeout(r, 50));

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      setProgressStep('save');
      await new Promise(r => setTimeout(r, 50));
      pdf.save('specifikaciya.pdf');
    } catch (error) {
      console.error('PDF export failed:', error);
      setProgressStep('error');
      await new Promise(r => setTimeout(r, 1500));
    } finally {
      setIsExporting(false);
      setProgressStep('');
    }
  };

  const getStepContent = () => {
    switch (progressStep) {
      case 'capture':
        return { text: 'Создание изображения спецификации...', icon: FileText };
      case 'generate':
        return { text: 'Формирование PDF документа...', icon: FileText };
      case 'save':
        return { text: 'Сохранение файла...', icon: CheckCircle };
      case 'error':
        return { text: 'Ошибка при экспорте', icon: AlertCircle };
      default:
        return { text: 'Подготовка...', icon: Loader };
    }
  };

  const { text: stepText, icon: StepIcon } = getStepContent();

  return (
    <>
      <button
        onClick={handleExportPDF}
        disabled={isExporting}
        className="p-4 pl-5 px-6 bg-[#F06900] text-white rounded-full shadow-md hover:bg-[#d95c00] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <Loader size={20} className="animate-spin" />
        ) : (
          <Printer size={20} />
        )}
        Экспорт спецификации PDF
      </button>

      {/* Professional loading overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 min-w-[360px] border border-gray-100">
            <div className="relative">
              {progressStep !== 'error' ? (
                <div className="w-16 h-16 border-4 border-gray-200 border-t-[#F06900] rounded-full animate-spin" />
              ) : (
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertCircle size={32} className="text-red-500" />
                </div>
              )}
              {progressStep === 'save' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-500" />
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-800">
                {StepIcon && <StepIcon size={20} className="text-[#F06900]" />}
                {stepText}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Пожалуйста, подождите
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden export content – unchanged from your version, kept intact for brevity */}
      <div
        ref={exportRef}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '795px',
          background: '#fff',
          padding: '40px',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          color: '#1e293b',
          lineHeight: '1.4',
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <img src="/logo.png" alt="Logo" style={{ maxHeight: '50px' }} />
        </div>
        <div style={{ borderBottom: '2px solid #f0f0f0', marginBottom: '24px', paddingBottom: '16px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, margin: 0 }}>Спецификация модулей</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>Детальный расчет стоимости конфигурации</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '32px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Название</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Тип фасада</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Ручка</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Вариант</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Цвет ручки</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Замена петель</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Цвет корпуса</th>
              <th style={{ textAlign: 'right', padding: '12px 8px' }}>Цена, ₽</th>
             </tr>
          </thead>
          <tbody>
            {modules.map(module => {
              const handleColorHex = `#${new Color(module.handleColor).getHexString()}`;
              const bodyColorHex = `#${new Color(module.color).getHexString()}`;
              return (
                <tr key={module.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px' }}>{module.displayName || module.name}</td>
                  <td style={{ padding: '10px 8px' }}>{module.facade}</td>
                  <td style={{ padding: '10px 8px' }}>{module.handles}</td>
                  <td style={{ padding: '10px 8px' }}>{module.handleVariant}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: handleColorHex }} />
                      <span style={{ fontFamily: 'monospace' }}>{handleColorHex}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px' }}>{hinges[module.hingeReplacement]?.name || '—'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: bodyColorHex }} />
                      <span style={{ fontFamily: 'monospace' }}>{bodyColorHex}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 8px' }}>{module.price.toLocaleString('ru-RU')}</td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '2px solid #cbd5e1', backgroundColor: '#fefce8' }}>
              <td colSpan={7} style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700 }}>Итого модули:</td>
              <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700 }}>{modulesTotal.toLocaleString('ru-RU')} ₽</td>
            </tr>
          </tbody>
        </table>
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Столешница</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#475569' }}>Тип:</span><span>{snap.tabletop[1]}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#475569' }}>Площадь:</span><span>{tabletopArea.toFixed(2)} м²</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#475569' }}>Цена за м²:</span><span>{snap.tabletop[2].toLocaleString('ru-RU')} ₽</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: '8px', borderTop: '1px solid #cbd5e1', gridColumn: 'span 2' }}>
              <span>Стоимость столешницы:</span><span>{tabletopPrice.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', borderTop: '2px solid #e2e8f0', paddingTop: '20px' }}>
          <div style={{ fontSize: '20px', fontWeight: 800 }}>Общая стоимость: {grandTotal.toLocaleString('ru-RU')} ₽</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Включая модули и столешницу</div>
        </div>
        <div style={{ marginTop: '40px', fontSize: '10px', color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          Документ сгенерирован автоматически • {new Date().toLocaleDateString('ru-RU')}
        </div>
      </div>
    </>
  );
}
