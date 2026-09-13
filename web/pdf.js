import {parseScutPages} from './core.js';
if(!Promise.withResolvers)Promise.withResolvers=function(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
export async function readPDF(data){
  const pdfjs=await import('../node_modules/pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdf.worker.min.mjs',location.href).href;
  const doc=await pdfjs.getDocument({data:new Uint8Array(data),isEvalSupported:false,useSystemFonts:true,cMapUrl:new URL('cmaps/',location.href).href,cMapPacked:true,standardFontDataUrl:new URL('standard_fonts/',location.href).href}).promise;
  if(doc.numPages>20){await doc.destroy();throw Error('最多支持 20 页课表');}
  try{const pages=[];for(let n=1;n<=doc.numPages;n++){const p=await doc.getPage(n),v=p.getViewport({scale:1}),t=await p.getTextContent();pages.push({height:v.height,items:t.items.filter(i=>i.str).map(i=>{const [x,y]=v.convertToViewportPoint(i.transform[4],i.transform[5]);return {str:i.str,x,y,width:i.width};})});}return parseScutPages(pages);}finally{await doc.destroy();}
}
