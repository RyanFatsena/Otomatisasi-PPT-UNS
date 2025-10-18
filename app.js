
(function(){
  const BG = window.__BG__;

  document.addEventListener('DOMContentLoaded', ()=>{
    const html=document.documentElement;
    const btn=document.getElementById('toggleTheme');
    if(btn){ 
      btn.addEventListener('click', ()=>{ 
        html.classList.toggle('dark'); 
        html.classList.toggle('light'); 
      }); 
    }
  });

  const status = t => { const el=document.getElementById('status'); if(el) el.textContent=t; };

  function sentenceCase(s){ if(!s) return s; return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase(); }
  function titleCase(s){ return (s||'').replace(/\w\S*/g, t=>t.charAt(0).toUpperCase()+t.slice(1).toLowerCase()); }

  function parse(md){
    const auto = document.getElementById('autoCase')?.checked;
    const lines = (md||'').split(/\r?\n/); const blocks=[]; let i=0;
    const push=(b)=>{ if(auto && (b.type==='title'||b.type==='subtitle')){ b.title=titleCase(b.title||''); b.subtitle=sentenceCase(b.subtitle||''); } blocks.push(b); };
    while(i<lines.length){
      const l=(lines[i]||'').trim();
      if(/^#\s*Judul/i.test(l)){
        i++; let title='', subtitle='';
        while(i<lines.length && lines[i].trim()!==''){
          const t=lines[i].trim();
          if(/^Subtitle\s*:/i.test(t)) subtitle=t.replace(/^Subtitle\s*:\s*/i,'').trim();
          else title = title? title+' '+t : t;
          i++;
        }
        push({type:'title', title, subtitle});
      } else if(/^#\s*SubBab/i.test(l)){
        i++; let title='', subtitle='';
        while(i<lines.length && lines[i].trim()!==''){
          const t=lines[i].trim();
          if(/^Sub\s*:/i.test(t)) subtitle=t.replace(/^Sub\s*:\s*/i,'').trim();
          else title = title? title+' '+t : t;
          i++;
        }
        push({type:'subtitle', title, subtitle});
      } else if(/^#\s*Isi/i.test(l)){
        i++; let title='', text='';
        while(i<lines.length && lines[i].trim()!==''){
          const t=lines[i].trim();
          if(!title) title=t; else text += (text?'\n':'') + t;
          i++;
        }
        push({type:'content', title, text});
      } else if(/^#\s*(Quotes|Terima\s*Kasih)/i.test(l)){
        i++; let text=''; while(i<lines.length && lines[i].trim()!==''){ text += (text?'\n':'')+lines[i++]; }
        push({type:'closing', text: text || 'Terima kasih'});
      }
      i++;
    }
    return blocks;
  }

  function loadImg(d){ return new Promise(r=>{ const im=new Image(); im.onload=()=>r(im); im.onerror=()=>r(null); im.src=d; }); }
  const pt = p => Math.round(p*1.33);

  async function drawThumb(block, w=1120, h=630){
    const c=document.createElement('canvas'); c.width=w; c.height=h; const ctx=c.getContext('2d');
    const key = block.type==='title'?'title':block.type==='subtitle'?'subtitle':block.type==='closing'?'closing':'content';
    const im = await loadImg(BG[key]); if(im) ctx.drawImage(im,0,0,w,h); else { ctx.fillStyle='#00AEEF'; ctx.fillRect(0,0,w,h); }
    ctx.fillStyle='#FFFFFF'; ctx.textBaseline='top';
    const write=(text,x,y,size=42,bold=false,maxW=w-160,align='left')=>{
      const effectiveX = (align==='center') ? (w/2) : (align==='right' ? (w - x) : x);
      ctx.font = `${bold?'900':'400'} ${size}px Lato, Arial`; ctx.textAlign=align;
      let line='', yy=y;
      for(const w1 of (text||'').split(' ')){
        const t = line ? line+' '+w1 : w1;
        if(ctx.measureText(t).width>maxW){ ctx.fillText(line,effectiveX,yy); yy+=size*1.22; line=w1; } else line=t;
      }
      if(line) ctx.fillText(line,effectiveX,yy);
    };

    if(block.type==='title'){
      write(block.title, pt(0.50*72), pt(1.5*72), pt(24), true, pt(6.8*72), 'left');
      write(block.subtitle, pt(0.50*72), pt(2.9*72), pt(12), false, pt(6.6*72), 'left');
    } else if(block.type==='subtitle'){
      write(block.title, pt(0.9*72), pt(1.6*72), pt(20), true, pt(8.5*72), 'left');
      if(block.subtitle) write(block.subtitle, pt(0.9*72), pt(3.0*72), pt(12), false, pt(8.3*72), 'left');
    } else if(block.type==='content'){
      write(block.title || '', pt(0.9*72), pt(1.1*72), pt(20), true, pt(7.0*72), 'left');
      let y = pt(2.1*72);
      if(block.text){
        const paragraphs = block.text.split(/\\n\\s*\\n/);
        for(const para of paragraphs){
          write(para.trim(), pt(0.9*72), y, pt(12), false, pt(7.2*72), 'left');
          y += pt(12)*2.0;
        }
      }
    } else {
      write(block.text||'Terima kasih', w/2, pt(2.3*72), pt(16), true, pt(8.0*72), 'center');
    }
    return c;
  }

  function applyAutoCase(blocks){
    const auto = document.getElementById('autoCase')?.checked;
    if(!auto) return blocks;
    return blocks.map(b=>{
      if(b.type==='title' || b.type==='subtitle'){
        b.title = titleCase(b.title||'');
        b.subtitle = sentenceCase(b.subtitle||'');
      }
      return b;
    });
  }

  async function renderPreview(){
    status('Rendering preview…');
    const blocks = applyAutoCase(parse(document.getElementById('rawText').value||''));
    const grid = document.getElementById('preview'); grid.innerHTML='';
    for(const b of blocks){
      const thumb=document.createElement('div'); thumb.className='thumb';
      const c=await drawThumb(b); const out=document.createElement('canvas'); const r=0.26; out.width=c.width*r; out.height=c.height*r; out.getContext('2d').drawImage(c,0,0,out.width,out.height);
      thumb.appendChild(out); grid.appendChild(thumb);
    }
    status('Preview ready ✓');
  }

  async function generatePPTX(){
    try{
      status('Generating PPTX…');
      const blocks=applyAutoCase(parse(document.getElementById('rawText').value||''));
      const pptx = new PptxGenJS(); pptx.layout='LAYOUT_16x9';
      for(const b of blocks){
        const slide=pptx.addSlide();
        const key=b.type==='title'?'title':b.type==='subtitle'?'subtitle':'content';
        slide.background = { data: BG[b.type==='closing'?'closing':key] };
        if(b.type==='title'){
          slide.addText(b.title||'', { x:0.50, y:1.5, w:6.8, h:1.6, fontFace:'Lato', bold:true, fontSize:24, color:'FFFFFF', align:'left' });
          if(b.subtitle) slide.addText(b.subtitle, { x:0.50, y:2.9, w:6.6, h:0.8, fontFace:'Lato', fontSize:12, color:'FFFFFF', align:'left' });
        } else if(b.type==='subtitle'){
          slide.addText(b.title||'', { x:0.9, y:1.6, w:8.5, h:1.2, fontFace:'Lato', bold:true, fontSize:20, color:'FFFFFF', align:'left' });
          if(b.subtitle) slide.addText(b.subtitle, { x:0.9, y:3.0, w:8.3, h:1.0, fontFace:'Lato', fontSize:12, color:'FFFFFF', align:'left' });
        } else if(b.type==='content'){
          if(b.title) slide.addText(b.title, { x:0.9, y:1.1, w:7.0, h:0.8, fontFace:'Lato', bold:true, fontSize:20, color:'FFFFFF', align:'left' });
          if(b.text){
            const paragraphs = b.text.split(/\\n\\s*\\n/);
            let y = 2.1;
            for(const p of paragraphs){
              slide.addText(p.trim(), { x:0.9, y, w:7.2, h:0.8, fontFace:'Lato', fontSize:12, color:'FFFFFF', align:'left' });
              y += 0.5;
            }
          }
        } else {
          slide.addText(b.text||'Terima kasih', { x:1.0, y:2.3, w:8.0, h:1.0, align:'center', fontFace:'Lato', bold:true, fontSize:16, color:'FFFFFF' });
        }
      }
      await pptx.writeFile({ fileName:'UNS-v6R17.pptx' });
      status('Done ✓');
    }catch(e){ console.error(e); status('Generate error'); alert('Gagal generate PPTX. Lihat console.'); }
  }

  // Upload handler (robust): txt, pdf (with legacy pdf.js + optional OCR), docx (mammoth), warn on doc
  document.addEventListener('DOMContentLoaded', ()=>{
    const fileEl = document.getElementById('fileInput');
    if(!fileEl) return;
    fileEl.addEventListener('change', async (e)=>{
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      status('Membaca file: ' + file.name + ' …');
      const ext = (file.name.split('.').pop()||'').toLowerCase();

      try{
        if(ext === 'txt'){
          const text = await file.text();
          document.getElementById('rawText').value = text;
          status('Teks dari TXT dimuat ✓');
        } else if(ext === 'docx'){
          const buf = await file.arrayBuffer();
          const result = await mammoth.extractRawText({arrayBuffer: buf});
          document.getElementById('rawText').value = (result && result.value) ? result.value : '';
          status('Teks dari DOCX dimuat ✓');
        } else if(ext === 'doc'){
          alert('Format .DOC (Word 97-2003) tidak didukung. Silakan konversi ke .DOCX.');
          status('Format .DOC tidak didukung');
        } else if(ext === 'pdf'){
          if (window.pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.10.111/pdf.worker.min.js";
          }
          const buf = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf), useWorkerFetch:false });
          const pdf = await loadingTask.promise;
          let text = '';
          for(let i=1;i<=pdf.numPages;i++){
            const page = await pdf.getPage(i);
            const content = await page.getTextContent({ normalizeWhitespace: true }).catch(()=>({items:[]}));
            const line = (content.items||[]).map(it=>it.str).join(' ').trim();
            if(line) text += line + '\\n\\n';
          }
          if(text.trim()){
            document.getElementById('rawText').value = text.trim();
            status('Teks dari PDF dimuat ✓');
          } else if(window.Tesseract){
            status('PDF tanpa teks. Menjalankan OCR...');
            let ocrText = '';
            for(let i=1;i<=pdf.numPages;i++){
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = viewport.width; canvas.height = viewport.height;
              await page.render({ canvasContext: ctx, viewport }).promise;
              const { data:{ text } } = await Tesseract.recognize(canvas, 'eng+ind');
              ocrText += (text||'').trim() + '\\n\\n';
            }
            document.getElementById('rawText').value = ocrText.trim();
            status('Teks hasil OCR dimuat ✓');
          } else {
            alert('Gagal membaca teks PDF. Coba nyalakan OCR atau konversi ke .docx.');
            status('Gagal membaca file');
          }
        } else {
          alert('Format tidak didukung: ' + ext);
          status('Format tidak didukung');
        }
      }catch(err){
        console.error(err);
        alert('Gagal membaca file. Coba format lain atau salin teksnya.');
        status('Gagal membaca file');
      }
    });

    // Bind buttons
    const bPrev=document.getElementById('btnPreview');
    const bGen=document.getElementById('btnGenerate');
    const bClr=document.getElementById('btnClear');
    if(bPrev) bPrev.addEventListener('click', renderPreview);
    if(bGen) bGen.addEventListener('click', generatePPTX);
    if(bClr) bClr.addEventListener('click', ()=>{ 
      document.getElementById('rawText').value=''; 
      document.getElementById('preview').innerHTML=''; 
      status('Cleared'); 
    });
  });
})();
