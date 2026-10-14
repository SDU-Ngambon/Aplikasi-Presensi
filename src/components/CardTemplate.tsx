import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { Rnd } from 'react-rnd';

export default function CardTemplate({ design, images, student, scale = 1, barcodeType = 'qrcode', onLayoutChange }: any) {
  // Convert mm logic
  const internalScale = design.unit === 'mm' ? 3.78 : (design.unit === 'cm' ? 37.8 : 1);
  const pxWidth = design.width * internalScale;
  const pxHeight = design.height * internalScale;

  const defaultL = {
      headerBg: { x: 0, y: 0, w: 324, h: 50 },
      logoLeft: { x: 10, y: 5, w: 40, h: 40 },
      logoRight: { x: 274, y: 5, w: 40, h: 40 },
      headerText: { x: 55, y: 5, w: 214, h: 40 },
      subtitleText: { x: 0, y: 50, w: 324, h: 18 },
      photo: { x: 10, y: 80, w: 75, h: 95 },
      qrCode: { x: 17, y: 180, w: 60, h: 60 },
      identity: { x: 95, y: 80, w: 220, h: 80 },
      signatureText: { x: 160, y: 155, w: 150, h: 60 },
      signature: { x: 175, y: 180, w: 120, h: 40 },
      customImage: { x: 10, y: 200, w: 40, h: 40 },
  };
  const L = design.layout ? { ...defaultL, ...design.layout } : defaultL;

  const getTextStyle = (weight: string) => {
      if (weight === 'bold') return { fontWeight: 'bold' as const, fontStyle: 'normal' as const };
      if (weight === 'italic') return { fontWeight: 'normal' as const, fontStyle: 'italic' as const };
      return { fontWeight: 'normal' as const, fontStyle: 'normal' as const };
  };

  const ItemWrapper = ({ id, children, className = '', containerStyle = {} }: any) => {
      const p = L[id];
      if (!p) return null;
      
      const isBg = id === 'headerBg';
      
      if (onLayoutChange) {
          return (
              <Rnd
                  size={{ width: p.w * scale, height: p.h * scale }}
                  position={{ x: p.x * scale, y: p.y * scale }}
                  onDragStop={(e, d) => {
                    onLayoutChange(id, { ...p, x: d.x / scale, y: d.y / scale });
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    onLayoutChange(id, {
                      x: position.x / scale,
                      y: position.y / scale,
                      w: ref.offsetWidth / scale,
                      h: ref.offsetHeight / scale
                    });
                  }}
                  bounds="parent"
                  style={{
                      position: 'absolute',
                      zIndex: isBg ? 0 : 10
                  }}
                  className="group hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-shadow duration-200"
              >
                  <div 
                      className={`w-full h-full border border-dashed border-transparent group-hover:border-blue-400 group-hover:bg-blue-500/5 transition-colors duration-200 relative ${className}`}
                      style={containerStyle}
                  >
                     {/* Label overlay when hovered */}
                     <div className="absolute -top-5 left-0 bg-blue-500 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        {id}
                     </div>
                     {children}
                  </div>
              </Rnd>
          );
      }

      // Read-only / print mode
      return (
          <div
              style={{
                  position: 'absolute',
                  left: `${p.x * scale}px`,
                  top: `${p.y * scale}px`,
                  width: p.w ? `${p.w * scale}px` : 'auto',
                  height: p.h ? `${p.h * scale}px` : 'auto',
                  zIndex: isBg ? 0 : 10,
                  ...containerStyle
              }}
              className={className}
          >
              {children}
          </div>
      );
  };

  return (
      <div 
         className="relative overflow-hidden bg-cover bg-center shrink-0"
         style={{
           width: `${pxWidth * scale}px`, 
           height: `${pxHeight * scale}px`,
           backgroundColor: design.bgColor,
           backgroundImage: images.background ? `url(${images.background})` : 'none',
           fontFamily: design.fontFamily,
         }}
      >
         {/* Background objects / static absolute */}
         <ItemWrapper id="headerBg" containerStyle={{ backgroundColor: design.headerColor }} />
         
         {/* Logo Left */}
         <ItemWrapper id="logoLeft" className="flex items-center justify-center">
             {images.logoLeft ? <img src={images.logoLeft} alt="Logo L" className="w-full h-full object-contain" /> : <div className="text-xs text-white/50 border border-white/30 w-full h-full flex items-center justify-center rounded">L1</div>}
         </ItemWrapper>

         {/* Logo Right */}
         <ItemWrapper id="logoRight" className="flex items-center justify-center">
             {images.logoRight ? <img src={images.logoRight} alt="Logo R" className="w-full h-full object-contain" /> : <div className="text-xs text-white/50 border border-white/30 w-full h-full flex items-center justify-center rounded">L2</div>}
         </ItemWrapper>

         {/* Header Text */}
         <ItemWrapper id="headerText" className="flex flex-col justify-center" containerStyle={{ color: design.headerTextColor || '#ffffff', textAlign: design.headerTextAlign || 'center', alignItems: design.headerTextAlign === 'left' ? 'flex-start' : design.headerTextAlign === 'right' ? 'flex-end' : 'center', ...getTextStyle(design.headerTextWeight || 'bold') }}>
             <div style={{ fontSize: `${design.titleSize * scale}px`, lineHeight: 1.1 }}>{design.headerText1}</div>
             <div style={{ fontSize: `${design.titleSize * scale}px`, lineHeight: 1.1 }}>{design.headerText2}</div>
         </ItemWrapper>

         {/* Subtitle / Unit Address */}
         <ItemWrapper id="subtitleText" className="opacity-90 border-t border-white/20 px-2 flex flex-col justify-center overflow-hidden" containerStyle={{ backgroundColor: design.subHeaderBgColor !== undefined ? design.subHeaderBgColor : design.headerColor, color: design.subtitleTextColor || '#ffffff', fontSize: `${(design.subtitleTextSize || ((design.titleSize || 18) - 4)) * scale}px`, fontFamily: design.subtitleFontFamily || design.fontFamily || 'sans-serif', ...getTextStyle(design.subtitleTextWeight || 'normal') }}>
             <span className="truncate w-full block" style={{ textAlign: design.subtitleTextAlign || 'center' }}>{design.subtitleText}</span>
         </ItemWrapper>

         {/* Photo Area */}
         <ItemWrapper id="photo" className="flex items-center justify-center bg-slate-200/50 backdrop-blur-sm border-2 border-white text-center text-slate-500 overflow-hidden shadow-sm">
             {(student && student.nisn) ? 
                 <img src={student?.photo ? (student.photo.startsWith('http') ? student.photo : `/uploads/photos/${student.photo.replace('photos/', '')}?t=${student?.photo}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(student?.name || 'Siswa')}&background=random`} onError={(e) => {
                     const target = e.target as HTMLImageElement;
                     target.onerror = null;
                     target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student?.name || 'Siswa')}&background=random`;
                 }} alt="foto" className="w-full h-full object-cover" />
                 : 
                 <span style={{ fontSize: `${8 * scale}px` }}>FOTO<br/>Siswa</span>
             }
         </ItemWrapper>

         {/* Custom Image */}
         <ItemWrapper id="customImage" className="flex items-center justify-center overflow-hidden">
             {images.customImage && <img src={images.customImage} alt="Custom" className="w-full h-full object-contain" />}
         </ItemWrapper>

         {/* Identity Data */}
         {/* Since texts can stretch, we use height as maximum or let it overflow visually depending on setup */}
         <ItemWrapper id="identity" className="flex flex-col overflow-hidden w-full text-left" containerStyle={{ fontSize: `${(design.identityTextSize || design.textSize || 12) * scale}px`, color: design.identityTextColor || '#000000', ...getTextStyle(design.identityTextWeight || 'normal') }}>
             <div style={{ display: 'grid', gridTemplateColumns: 'max-content max-content 1fr', columnGap: `${4 * scale}px`, rowGap: `${2 * scale}px`, width: '100%', alignItems: 'start', justifyContent: design.identityTextAlign === 'center' ? 'center' : design.identityTextAlign === 'right' ? 'end' : 'start' }}>
                 <div className="font-bold" style={{ fontSize: `${((design.identityTextSize || design.textSize || 12) + 1) * scale}px` }}>Nama</div>
                 <div className="font-bold" style={{ fontSize: `${((design.identityTextSize || design.textSize || 12) + 1) * scale}px` }}>:</div>
                 <div className="font-bold whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: `${((design.identityTextSize || design.textSize || 12) + 1) * scale}px` }}>{student?.name || 'NAMA SISWA'}</div>
                 
                 <div className="font-semibold">NISN</div>
                 <div>:</div>
                 <div className="truncate">{student?.nisn || '0012345678'}</div>
                 
                 <div className="font-semibold">NIS</div>
                 <div>:</div>
                 <div className="truncate">{student?.nis || '232410101'}</div>
                 
                 <div className="font-semibold">Kelas</div>
                 <div>:</div>
                 <div className="truncate">{student?.class || '10 RPL 1'}</div>
                 
                 {student?.customFields && Object.keys(student.customFields).slice(0, 2).map((k: string) => (
                     <React.Fragment key={k}>
                         <div className="font-semibold truncate max-w-[100px]">{k}</div>
                         <div>:</div>
                         <div className="truncate">{student.customFields[k]}</div>
                     </React.Fragment>
                 ))}
                 {!student?.customFields && (
                     <React.Fragment>
                         <div className="font-semibold">Alamat</div>
                         <div>:</div>
                         <div className="truncate">Jl. Lintas Utara Km 12</div>
                     </React.Fragment>
                 )}
             </div>
         </ItemWrapper>

         {/* Signature Image */}
         <ItemWrapper id="signature" className="flex items-center justify-center overflow-hidden">
             {images.signature ? <img src={images.signature} className="w-full h-full object-contain" alt="TTD" /> : <span className="text-slate-300 italic text-xs">IMG</span>}
         </ItemWrapper>

         {/* Signature Text */}
         <ItemWrapper id="signatureText" className="flex flex-col justify-between" containerStyle={{ fontSize: `${(design.headmasterTextSize || 10) * scale}px`, color: design.headmasterTextColor || '#000000', textAlign: design.headmasterTextAlign || 'center', alignItems: design.headmasterTextAlign === 'left' ? 'flex-start' : design.headmasterTextAlign === 'right' ? 'flex-end' : 'center', ...getTextStyle(design.headmasterTextWeight || 'normal') }}>
             <p className="whitespace-nowrap">Kepala Sekolah,</p>
             <div className="flex-1" />
             <div className="w-full truncate">
                <p className="font-bold border-b border-black inline-block leading-tight px-1 truncate max-w-full">{design.headmasterName}</p>
                <p className="mt-0.5 leading-none truncate w-full">NIP: {design.headmasterNip}</p>
             </div>
         </ItemWrapper>

         {/* QR Code / Barcode */}
         <ItemWrapper id="qrCode" className="bg-white p-1 border shadow-sm flex items-center justify-center overflow-hidden">
             {barcodeType === 'barcode' ? (
                 <div id="barcode-container" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Barcode value={student?.nisn || "0012345678"} format="CODE128" width={2} height={40} displayValue={false} background="transparent" margin={0} />
                     <style>{`#barcode-container svg { width: 100%; height: 100%; object-fit: contain; }`}</style>
                 </div>
             ) : (
                 <QRCodeSVG value={student?.qrCode || student?.nisn || "0012345678"} width="100%" height="100%" />
             )}
         </ItemWrapper>

         {/* Custom Texts */}
         {(design.customTexts || []).map((ct: any) => (
             <ItemWrapper 
                 key={ct.id} 
                 id={ct.id} 
                 className="flex flex-col justify-center"
                 containerStyle={{ 
                     fontSize: `${ct.size * scale}px`, 
                     color: ct.color, 
                     fontFamily: ct.fontFamily || design.fontFamily,
                     textAlign: ct.textAlign || 'left',
                     alignItems: ct.textAlign === 'center' ? 'center' : ct.textAlign === 'right' ? 'flex-end' : 'flex-start',
                     ...getTextStyle(ct.fontWeight || 'normal')
                 }}
             >
                 {ct.text}
             </ItemWrapper>
         ))}
      </div>
  );
}
