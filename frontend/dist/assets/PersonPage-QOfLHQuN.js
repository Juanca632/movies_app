import{a as m,r as l,j as s}from"./index-Dq4Stfjf.js";import{f as d}from"./swiper-bundle-C51L7z_K.js";import{M as f}from"./MovieList-CU17qKm7.js";import{l as h}from"./loading_banner_img-qDW4rTdH.js";import{T as p}from"./TvShowList-Dnrcytev.js";function y(){var o;const{id:t}=m(),[e,n]=l.useState(null),[a,i]=l.useState(null);return l.useEffect(()=>{window.scrollTo(0,0)},[t]),l.useEffect(()=>{const c=async()=>{try{const r=await d(`person/${t}`);r&&(n(r),i(null))}catch(r){console.error("Error fetching movie:",r),i("Error fetching data. Retrying...")}};c();const x=setInterval(()=>{a&&c()},5e3);return()=>clearInterval(x)},[a,t]),s.jsxs("div",{className:"min-h-screen w-full bg-zinc-900 text-4xl text-white md:py-10 py-0",children:[s.jsxs("div",{className:"grid xl:grid-cols-[auto_1fr] xl:grid-rows-[auto] xl:gap-20 gap-5 grid-cols-[auto] grid-rows-[auto-auto]  w-full md:py-5 pb-5 md:px-10 px-0 relative",children:[s.jsx("div",{className:"relative flex justify-center items-center",children:e!=null&&e.profile_path?s.jsx("img",{src:`https://image.tmdb.org/t/p/w500${e==null?void 0:e.profile_path}`,alt:"profile_path",className:"object-cover h-full xl:h-150"}):s.jsxs(s.Fragment,{children:[s.jsx("img",{src:h,alt:"Loading image",className:"object-cover h-full xl:h-150"}),s.jsx("div",{className:"skeleton-image absolute inset-0  z-10"})]})}),s.jsxs("div",{className:"w-full flex justify-center flex-col px-5 gap-3",children:[s.jsx("h1",{className:"md:text-6xl text-3xl",children:e==null?void 0:e.name}),s.jsx("div",{className:"flex gap-7",children:s.jsx("div",{children:s.jsx("p",{className:"text-gray-600",children:e==null?void 0:e.place_of_birth})})}),s.jsx("p",{className:"text-base md:text-xl",children:(e==null?void 0:e.biography)&&((o=e==null?void 0:e.biography)==null?void 0:o.split(".").slice(0,10).join("."))+((e==null?void 0:e.biography.split(".").length)>3?".":"")})]})]}),s.jsxs("div",{className:"flex flex-col gap-10 py-10",children:[s.jsx(f,{endpoint:`person/${t}/movies`,title:"Movies",person:!1}),s.jsx(p,{endpoint:`person/${t}/tv-shows`,title:"TV shows",person:!1})]})]})}export{y as default};
