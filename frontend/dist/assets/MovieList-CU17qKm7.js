import{r as a,b as M,j as s}from"./index-Dq4Stfjf.js";import{S as w,A as g,N as h,a as P,b as i,M as l,f as b}from"./swiper-bundle-C51L7z_K.js";function S({endpoint:p,title:u,person:j}){const[r,v]=a.useState([]),[x,n]=a.useState(null),[c,N]=a.useState(!1);a.useEffect(()=>{const e=async()=>{try{const o=await b(p);o&&(v(o),n(null))}catch{n("Error fetching data. Retrying...")}};e();const t=setInterval(()=>{x&&(n(null),e())},3e3);return()=>clearInterval(t)},[x,p]),a.useEffect(()=>{const e=()=>{N(window.innerWidth<=768)};return e(),window.addEventListener("resize",e),()=>window.removeEventListener("resize",e)},[]);const m=M(),d=(e,t)=>{m(`/movie/${e}/${t}`)},f=(e,t)=>{m(`/person/${e}/${t}`)};return s.jsxs("div",{className:"",children:[s.jsx("h1",{className:"text-white xl:text-3xl text-2xl font-bold mb-3 xl:!px-10 !px-5",children:u}),j?s.jsx(w,{slidesPerView:"auto",spaceBetween:10,navigation:!c,modules:[g,h,P],className:"swiper w-full flex items-center justify-center xl:!px-10 !px-5",children:r.length>0?r.filter(e=>e.known_for_department==="Acting").map(e=>s.jsx(i,{className:"sm:!w-[200px] sm:!h-[200px] !w-[150px] !h-[150px] ",children:s.jsx(l,{title:e.name,imageUrl:`https://image.tmdb.org/t/p/w500${e.profile_path}`,person:!0,id:e.id,goToPage:f})},e.id)):new Array(15).fill(null).map((e,t)=>s.jsx(i,{className:"sm:!w-[200px] sm:!h-[200px] !w-[150px] !h-[150px]",children:s.jsx(l,{title:"",imageUrl:"",person:!0,id:0,goToPage:f})},t))}):s.jsx(w,{slidesPerView:"auto",spaceBetween:10,navigation:!c,modules:[g,h],className:"swiper w-full flex items-center justify-center xl:!px-10 !px-5",children:r.length>0?r.map((e,t)=>s.jsx(i,{className:"sm:!w-[200px] sm:!h-[300px] !w-[133px] !h-[200px]",children:s.jsx(l,{title:e.title?e.title:e.name,imageUrl:`https://image.tmdb.org/t/p/w500${e.poster_path}`,person:!1,id:e.id,goToPage:d})},t)):new Array(15).fill(null).map((e,t)=>s.jsx(i,{className:"sm:!w-[200px] sm:!h-[300px] !w-[133px] !h-[200px]",children:s.jsx(l,{title:"",imageUrl:"",person:!1,id:0,goToPage:d})},t))})]})}export{S as M};
