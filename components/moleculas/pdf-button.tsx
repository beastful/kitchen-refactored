'use client';

import { useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import { store } from '@/store';
import { Color } from 'three';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CATEGORY_ROOM } from '@/constants';
import { getSceneCanvas, canvasToDataUrlSafe } from '@/lib/capture-preview';
import {
  Loader,
  Printer,
  FileText,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';

const hingeOptions = [
  { name: 'Нет', price: 0 },
  { name: 'Да', price: 350 },
  { name: 'Да', price: 650 },
];

type ExportStep = '' | 'scene' | 'capture' | 'generate' | 'save' | 'error';

export function PDFExportButton() {
  const snap_modules = useSnapshot(store.modules);
  const snap_tabletop = useSnapshot(store.tabletop);

  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [progressStep, setProgressStep] = useState<ExportStep>('');

  const modules = snap_modules.filter((m: any) => !m.tags.includes(CATEGORY_ROOM));

  const modulesBaseTotal = modules.reduce((sum, m) => sum + m.price, 0);

  const hingeTotal = modules.reduce((sum, m) => {
    const idx = Math.min(Math.max(0, m.hingeReplacement ?? 0), hingeOptions.length - 1);
    return sum + hingeOptions[idx].price;
  }, 0);

  const modulesTotalWithHinges = modulesBaseTotal + hingeTotal;

  const tabletopArea = modules.reduce((area, m) => area + m.size.z * m.size.x, 0);
  const tabletopPrice = Math.ceil(tabletopArea * snap_tabletop[2]);
  const grandTotal = modulesTotalWithHinges + tabletopPrice;

  const addMultiPageImage = (
    pdf: jsPDF,
    imgData: string,
    imgWidth: number,
    imgHeight: number,
    startY = 0,
    x = 0
  ) => {
    const pageHeight = pdf.internal.pageSize.getHeight();

    let heightLeft = imgHeight;
    let position = startY;

    pdf.addImage(imgData, 'PNG', x, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', x, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  };

  const handleExportPDF = async () => {
    if (!exportRef.current || isExporting) return;

    setIsExporting(true);

    try {
      setProgressStep('scene');
      await new Promise((r) => setTimeout(r, 100));

      const sceneCanvas = getSceneCanvas();
      let sceneImgData: string | null = null;

      if (sceneCanvas) {
        sceneImgData = await canvasToDataUrlSafe(sceneCanvas);
      }

      setProgressStep('capture');
      await new Promise((r) => setTimeout(r, 100));

      const specCanvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });

      const specImgData = specCanvas.toDataURL('image/png');

      setProgressStep('generate');
      await new Promise((r) => setTimeout(r, 100));

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      let currentY = margin;

      if (sceneImgData) {
        const props = pdf.getImageProperties(sceneImgData);

        const maxWidth = contentWidth;
        const maxHeight = 100;

        let drawWidth = maxWidth;
        let drawHeight = (props.height * drawWidth) / props.width;

        if (drawHeight > maxHeight) {
          drawHeight = maxHeight;
          drawWidth = (props.width * drawHeight) / props.height;
        }

        const x = margin + (contentWidth - drawWidth) / 2;

        pdf.addImage(
          sceneImgData,
          'PNG',
          x,
          currentY,
          drawWidth,
          drawHeight,
          undefined,
          'FAST'
        );

        currentY += drawHeight + 8;

        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 8;
      }

      const availableFirstPageHeight = pageHeight - currentY;
      const specWidth = pageWidth;
      const specHeight = (specCanvas.height * specWidth) / specCanvas.width;

      if (specHeight <= availableFirstPageHeight) {
        pdf.addImage(specImgData, 'PNG', 0, currentY, specWidth, specHeight);
      } else {
        addMultiPageImage(pdf, specImgData, specWidth, specHeight, currentY, 0);
      }

      setProgressStep('save');
      await new Promise((r) => setTimeout(r, 100));

      pdf.save('specifikaciya.pdf');
    } catch (error) {
      console.error('PDF export failed:', error);
      setProgressStep('error');
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      setIsExporting(false);
      setProgressStep('');
    }
  };

  const getStepContent = () => {
    switch (progressStep) {
      case 'scene':
        return { text: 'Создание снимка 3D сцены...', icon: ImageIcon };
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
              <p className="text-sm text-gray-500 mt-2">Пожалуйста, подождите</p>
            </div>
          </div>
        </div>
      )}

      <div
        ref={exportRef}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '900px',
          background: '#fff',
          padding: '40px',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          color: '#1e293b',
          lineHeight: '1.4',
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <img src="logo.png" alt="Logo" style={{ maxHeight: '50px' }} />
        </div>

        <div
          style={{
            borderBottom: '2px solid #f0f0f0',
            marginBottom: '24px',
            paddingBottom: '16px',
          }}
        >
          <h1 style={{ fontSize: '26px', fontWeight: 700, margin: 0 }}>
            Спецификация модулей
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
            Детальный расчет стоимости конфигурации
          </p>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
            marginBottom: '32px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Название</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Тип фасада</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Ручка</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Вариант</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Цвет ручки</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Замена петель</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Цвет корпуса</th>
              <th style={{ textAlign: 'right', padding: '12px 8px' }}>Цена модуля, ₽</th>
              <th style={{ textAlign: 'right', padding: '12px 8px' }}>Петли, ₽</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module: any) => {
              const handleColorHex = `#${new Color(module.handleColor).getHexString()}`;
              const bodyColorHex = `#${new Color(module.color).getHexString()}`;
              const hingeIdx = Math.min(
                Math.max(0, module.hingeReplacement ?? 0),
                hingeOptions.length - 1
              );
              const hingeName = hingeOptions[hingeIdx].name;
              const hingePrice = hingeOptions[hingeIdx].price;

              return (
                <tr key={module.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px' }}>{module.displayName || module.name}</td>
                  <td style={{ padding: '10px 8px' }}>{module.facade}</td>
                  <td style={{ padding: '10px 8px' }}>{module.handles}</td>
                  <td style={{ padding: '10px 8px' }}>{module.handleVariant}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '4px',
                          backgroundColor: handleColorHex,
                        }}
                      />
                      <span style={{ fontFamily: 'monospace' }}>{handleColorHex}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px' }}>{hingeName}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '4px',
                          backgroundColor: bodyColorHex,
                        }}
                      />
                      <span style={{ fontFamily: 'monospace' }}>{bodyColorHex}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 8px' }}>
                    {module.price.toLocaleString('ru-RU')}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 8px' }}>
                    {hingePrice.toLocaleString('ru-RU')}
                  </td>
                </tr>
              );
            })}

            <tr style={{ borderTop: '2px solid #cbd5e1', backgroundColor: '#fefce8' }}>
              <td
                colSpan={7}
                style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700 }}
              >
                Итого модули
              </td>
              <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700 }}>
                {modulesBaseTotal.toLocaleString('ru-RU')} ₽
              </td>
              <td></td>
            </tr>

            <tr style={{ backgroundColor: '#fefce8' }}>
              <td
                colSpan={7}
                style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700 }}
              >
                Итого замена петель
              </td>
              <td></td>
              <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700 }}>
                {hingeTotal.toLocaleString('ru-RU')} ₽
              </td>
            </tr>

            <tr style={{ backgroundColor: '#fefce8', borderBottom: '1px solid #cbd5e1' }}>
              <td
                colSpan={7}
                style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700 }}
              >
                Всего модули (с петлями)
              </td>
              <td
                colSpan={2}
                style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700 }}
              >
                {modulesTotalWithHinges.toLocaleString('ru-RU')} ₽
              </td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
            Столешница
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>Тип:</span>
              <span>{snap_tabletop[1]}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>Площадь:</span>
              <span>{tabletopArea.toFixed(2)} м²</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>Цена за м²:</span>
              <span>{snap_tabletop[2].toLocaleString('ru-RU')} ₽</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
                paddingTop: '8px',
                borderTop: '1px solid #cbd5e1',
                gridColumn: 'span 2',
              }}
            >
              <span>Стоимость столешницы:</span>
              <span>{tabletopPrice.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', borderTop: '2px solid #e2e8f0', paddingTop: '20px' }}>
          <div style={{ fontSize: '20px', fontWeight: 800 }}>
            Общая стоимость: {grandTotal.toLocaleString('ru-RU')} ₽
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Включая модули (с петлями) и столешницу
          </div>
        </div>

        <div
          style={{
            marginTop: '40px',
            fontSize: '10px',
            color: '#94a3b8',
            textAlign: 'center',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '16px',
          }}
        >
          Документ сгенерирован автоматически • {new Date().toLocaleDateString('ru-RU')}
        </div>
      </div>
    </>
  );
}
