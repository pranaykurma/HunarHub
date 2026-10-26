import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft, ArrowRight, Search, MapPin, Star, ShieldCheck, ShoppingBag,
  Scissors, Hammer, Palette, Store, Sparkles, Menu, X, ChevronRight,
  Clock3, Heart, Users, HandHeart, SlidersHorizontal, CalendarDays,
  CheckCircle2, MessageCircle, Award, IndianRupee, UserRound
} from "lucide-react";
import "./styles.css";

const categories = [
  { name: "Tailors", icon: Scissors, count: "128+ makers" },
  { name: "Cobblers", icon: Hammer, count: "64+ makers" },
  { name: "Potters", icon: Sparkles, count: "82+ makers" },
  { name: "Artisans", icon: Palette, count: "146+ makers" },
  { name: "Small Vendors", icon: Store, count: "210+ makers" },
];

const entrepreneurs = [];

const products = [];

async function imageFileToDataUrl(file) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Profile image must be smaller than 2 MB.");

  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not process the image."));
    image.src = source;
  });

  const maxSize = 700;
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function normalizeProduct(p){
  return {
    ...p,
    id: p.id || p._id,
    name: p.name || "Unnamed product",
    price: Number(p.price || 0),
    image: p.image || "",
    category: p.category || "Local product",
    description: p.description || "",
    stock: Number(p.stock ?? 0),
    maker: p.maker || p.entrepreneurId?.businessName || "Local entrepreneur",
  };
}

function App(){
  const [menuOpen,setMenuOpen]=useState(false), [page,setPage]=useState("home"), [selected,setSelected]=useState(null);
  const [toast,setToast]=useState("");
  const [deleteModalOpen,setDeleteModalOpen]=useState(false);
  const [deletePassword,setDeletePassword]=useState("");
  const [deleteConfirmText,setDeleteConfirmText]=useState("");
  const [deleteBusy,setDeleteBusy]=useState(false);
  const [authUser,setAuthUser]=useState(()=>{try{return JSON.parse(localStorage.getItem("hh_user"))}catch{return null}});
  const cartKeyForUser=user=>{
    if(!user || user.role!=="customer") return "hh_cart_guest";
    const identity=user._id||user.id||user.email||user.name||"customer";
    return `hh_cart_customer_${String(identity).trim().toLowerCase()}`;
  };
  const [cart,setCart]=useState([]);
  const skipCartPersist=useRef(true);
  const notify=m=>{setToast(m);clearTimeout(window.__hhToast);window.__hhToast=setTimeout(()=>setToast(""),2500)};
  const openProfile=e=>{setSelected(e);setPage("profile");window.scrollTo({top:0,behavior:"smooth"})};
  const openProduct=p=>{setSelected(p);setPage("product");window.scrollTo({top:0,behavior:"smooth"})};
  const nav=p=>{setPage(p);setSelected(null);setMenuOpen(false);window.scrollTo({top:0,behavior:"smooth"});};
  useEffect(()=>{
    const key=cartKeyForUser(authUser);
    if(authUser?.role!=="customer"){
      setCart([]);
      skipCartPersist.current=true;
      return;
    }
    try{
      const saved=JSON.parse(localStorage.getItem(key)||"[]");
      setCart(Array.isArray(saved)?saved:[]);
    }catch{setCart([])}
    skipCartPersist.current=true;
  },[authUser]);
  useEffect(()=>{
    if(skipCartPersist.current){
      skipCartPersist.current=false;
      return;
    }
    if(authUser?.role!=="customer") return;
    localStorage.setItem(cartKeyForUser(authUser),JSON.stringify(cart));
  },[cart,authUser]);
  const addToCart=p=>{
    if(!authUser || authUser.role!=="customer"){notify("Please sign in as a customer to use the cart.");return;}
    const product=normalizeProduct(p);
    if(product.stock<=0){notify(`${product.name} is out of stock.`);return;}
    setCart(prev=>{
      const key=product.id||product._id||product.name;
      const found=prev.find(x=>(x.id||x._id||x.name)===key);
      if(found){
        const nextQty=Math.min(found.qty+1,product.stock);
        return prev.map(x=>(x.id||x._id||x.name)===key?{...x,...product,qty:nextQty}:x);
      }
      return [...prev,{...product,qty:1}];
    });
    notify(`${product.name} added to cart.`);
  };
  const updateQty=(identity,qty)=>setCart(prev=>prev.map(x=>{
    if((x.id||x._id||x.name)!==identity)return x;
    const max=Number(x.stock||0);
    return qty<=0?null:{...x,qty:Math.min(qty,max)};
  }).filter(Boolean));
  const logout=()=>{localStorage.removeItem("hh_token");localStorage.removeItem("hh_user");setCart([]);setAuthUser(null);nav("home");notify("You have been logged out.")};
  const deleteMyAccount=()=>{
    if(!authUser || !["customer","entrepreneur"].includes(authUser.role)){notify("This option is available only for customer and entrepreneur accounts.");return;}
    setDeletePassword("");
    setDeleteConfirmText("");
    setDeleteModalOpen(true);
  };
  const confirmDeleteAccount=async()=>{
    if(!deletePassword.trim()){notify("Enter your current password.");return;}
    if(deleteConfirmText.trim()!=="DELETE"){notify("Type DELETE exactly to confirm.");return;}
    setDeleteBusy(true);
    try{
      const res=await fetch("http://localhost:5000/api/auth/account",{method:"DELETE",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("hh_token")}`},body:JSON.stringify({password:deletePassword,confirmText:deleteConfirmText.trim()})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.message||"Could not delete account.");
      setDeleteModalOpen(false);setDeletePassword("");setDeleteConfirmText("");
      localStorage.removeItem("hh_token");localStorage.removeItem("hh_user");setCart([]);setAuthUser(null);nav("home");notify("Account deleted successfully.");
    }catch(error){notify(error.message||"Could not delete account.");}
    finally{setDeleteBusy(false);}
  };
  const protectedPage = ["customer","entrepreneur","admin"].includes(page);
  if (protectedPage && (!authUser || authUser.role !== page)) {
    if (page !== "login") {
      if (page !== "home") {
        window.setTimeout(()=>setPage("login"),0);
      }
      return <div className="app"><div className="route-guard"><ShieldCheck/><h2>Login required</h2><p>Please sign in with the correct HunarHub account to access this dashboard.</p><button className="btn btn-dark" onClick={()=>nav("login")}>Go to login <ArrowRight/></button></div></div>;
    }
  }

  return <div className="app">
    {toast&&<div className="toast">{toast}</div>}
    {deleteModalOpen&&<div role="presentation" onClick={()=>{if(!deleteBusy)setDeleteModalOpen(false)}} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(15,23,42,.65)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:440,background:"var(--paper, #fff)",color:"var(--ink, #222)",borderRadius:16,padding:24,boxShadow:"0 20px 70px rgba(0,0,0,.3)"}}>
        <h2 id="delete-account-title" style={{marginTop:0}}>Delete account?</h2>
        <p>This will deactivate your account and anonymize personal details. Marketplace transaction records may be retained.</p>
        <label style={{display:"block",margin:"16px 0 6px",fontWeight:600}} htmlFor="delete-current-password">Current password</label>
        <input id="delete-current-password" type="password" autoComplete="current-password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)} placeholder="Enter current password" style={{boxSizing:"border-box",width:"100%",padding:12,border:"1px solid #cbd5e1",borderRadius:8}} />
        <label style={{display:"block",margin:"16px 0 6px",fontWeight:600}} htmlFor="delete-confirm-text">Type DELETE to confirm</label>
        <input id="delete-confirm-text" value={deleteConfirmText} onChange={e=>setDeleteConfirmText(e.target.value)} placeholder="DELETE" style={{boxSizing:"border-box",width:"100%",padding:12,border:"1px solid #cbd5e1",borderRadius:8}} />
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:22}}>
          <button type="button" disabled={deleteBusy} onClick={()=>setDeleteModalOpen(false)} style={{padding:"10px 16px",borderRadius:8,border:"1px solid #cbd5e1",background:"transparent",cursor:"pointer"}}>Cancel</button>
          <button type="button" disabled={deleteBusy} onClick={confirmDeleteAccount} style={{padding:"10px 16px",borderRadius:8,border:0,background:"#b91c1c",color:"white",cursor:deleteBusy?"wait":"pointer",opacity:deleteBusy?.7:1}}>{deleteBusy?"Deleting…":"Delete account"}</button>
        </div>
      </section>
    </div>}
    <header className="navbar"><div className="container nav-inner">
      <button className="brand brand-button" onClick={()=>nav("home")}><span className="brand-mark">H</span><span>Hunar<span>Hub</span></span></button>
      <button className="cart-top-btn" onClick={()=>nav("cart")}><ShoppingBag/> <span>Cart</span>{cart.length>0&&<b>{cart.reduce((s,x)=>s+x.qty,0)}</b>}</button>
      <button className="account-nav-btn" onClick={()=>authUser?nav(authUser.role):nav("login")}><UserRound/> Account</button>
      <nav className={`nav-links ${menuOpen?"open":""}`}>
        <button onClick={()=>nav("home")}>Home</button><button onClick={()=>nav("explore")}>Explore</button><button onClick={()=>document.getElementById("services")?.scrollIntoView({behavior:"smooth"})}>Services</button><button onClick={()=>document.getElementById("products")?.scrollIntoView({behavior:"smooth"})}>Products</button><button onClick={()=>document.getElementById("how")?.scrollIntoView({behavior:"smooth"})}>How it works</button>
        <div className="mobile-actions"><button className="btn btn-ghost" onClick={()=>authUser?nav(authUser.role):nav("login")}>{authUser?"Dashboard":"Log in"}</button>{authUser?<button className="btn btn-dark" onClick={logout}>Log out</button>:<button className="btn btn-dark" onClick={()=>nav("login")}>Join HunarHub</button>}</div>
      </nav>
      <div className="nav-actions">{authUser?<button className="btn btn-dark" onClick={logout}>Log out</button>:<button className="btn btn-dark" onClick={()=>nav("login")}>Join HunarHub</button>}</div>
      <button className="menu-btn" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button>
    </div></header>

    {page==="home" && <Home notify={notify} openProfile={openProfile} nav={nav} openProduct={openProduct}/>}
    {page==="login" && <LoginPage nav={nav} notify={notify} setAuthUser={setAuthUser}/>}
    {page==="explore" && <Explore notify={notify} openProfile={openProfile}/>}
    {page==="profile" && selected && <Profile maker={selected} notify={notify} back={()=>nav("explore")}/>}
    {page==="product" && selected && <ProductDetails product={selected} notify={notify} addToCart={addToCart} back={()=>nav("home")}/>}
    {page==="cart" && <CartPage cart={cart} updateQty={updateQty} nav={nav}/>}
    {page==="checkout" && <CheckoutPage cart={cart} nav={nav} clearCart={()=>setCart([])} notify={notify}/>}
    {page==="customer" && <CustomerDashboard nav={nav} notify={notify} addToCart={addToCart} deleteMyAccount={deleteMyAccount}/>}
    {page==="entrepreneur" && <EntrepreneurDashboard nav={nav} notify={notify} deleteMyAccount={deleteMyAccount}/>}
    {page==="admin" && <AdminDashboard nav={nav} notify={notify}/>}
  </div>
}

function Home({notify,openProfile,nav,openProduct}){
 return <main>
  <section className="hero" id="home"><div className="hero-glow glow-one"/><div className="hero-glow glow-two"/><div className="container hero-grid">
   <div className="hero-copy"><div className="eyebrow"><span className="pulse-dot"/> Local talent. Real stories. One marketplace.</div><h1>Discover the <em>hands</em> behind the craft.</h1><p className="hero-text">Find trusted local makers, skilled service providers and handmade products. Support the people who keep traditional skills alive.</p>
    <div className="search-card"><div className="search-field"><Search/><div><label>What are you looking for?</label><input id="homeSearch" placeholder="Tailor, pottery, handmade gifts..."/></div></div><div className="search-divider"/><div className="search-field"><MapPin/><div><label>Location</label><input placeholder="City or area"/></div></div><button className="search-btn" onClick={()=>nav("explore")}>Search <ArrowRight/></button></div>
    <div className="trust-row"><span><ShieldCheck/> Verified entrepreneurs</span><span><Users/> Local community</span><span><HandHeart/> Support local</span></div>
   </div>
   <div className="hero-visual"><div className="image-stack"><img className="main-image" src="https://i.postimg.cc/y6kLwygQ/Chat-GPT-Image-Aug-22-2026-11-46-47-AM.png" alt="Local artisan"/><div className="floating-card maker-card"><div className="mini-avatar"><ShieldCheck/></div><div><strong>Live marketplace</strong><span>Verified local talent</span></div><span className="verified"><CheckCircle2/></span></div></div></div>
  </div></section>
  <section className="section categories"><div className="container"><div className="section-head"><div><span className="section-kicker">Explore skills</span><h2>Find the right local expert.</h2></div><button className="text-btn" onClick={()=>nav("explore")}>View all categories <ChevronRight/></button></div><div className="category-grid">{categories.map(({name,icon:Icon,count})=><button className="category-card" key={name} onClick={()=>nav("explore")}><span className="category-icon"><Icon/></span><strong>{name}</strong><span>Explore category</span><ChevronRight className="category-arrow"/></button>)}</div></div></section>
  <section className="section soft-section"><div className="container"><div className="section-head"><div><span className="section-kicker">Meet the makers</span><h2>Trusted local entrepreneurs.</h2><p className="section-description">Real skills, transparent profiles and people you can connect with directly.</p></div><button className="text-btn" onClick={()=>nav("explore")}>Explore all <ChevronRight/></button></div><div className="empty-state home-empty"><Users/><h3>No entrepreneurs listed yet</h3><p>Approved entrepreneurs will appear here after they publish their profiles.</p></div></div></section>
  <section className="section" id="services"><div className="container split-heading"><div><span className="section-kicker">Services & products</span><h2>Buy local. Book local.</h2></div><p className="section-description">From custom stitching to handmade pottery, HunarHub puts local skills and products in one place.</p></div><LiveServices notify={notify}/><div className="container" id="products"><LiveProducts notify={notify} openProduct={openProduct}/></div></section>
  <section className="how-section" id="how"><div className="container"><div className="center-heading"><span className="section-kicker light">Simple by design</span><h2>How HunarHub works</h2><p>Three simple steps to discover skills, support makers and get things done locally.</p></div><div className="steps"><Step n="01" title="Discover" text="Search by skill, category, location or price to find the right local entrepreneur."/><Step n="02" title="Connect or order" text="Request a service or purchase a handmade product with clear pricing and availability."/><Step n="03" title="Support local" text="Track your request, complete the transaction and leave honest feedback."/></div></div></section>
  <section className="cta-section"><div className="container cta-inner"><div><span className="section-kicker light">For local entrepreneurs</span><h2>Turn your skill into a digital storefront.</h2><p>Create a profile, showcase your work and reach more customers.</p></div><button className="btn btn-light" onClick={()=>notify("Entrepreneur onboarding comes in the dashboard phase.")}>Become a maker <ArrowRight/></button></div></section>
  <Footer/>
 </main>
}

function LiveProducts({notify,openProduct}){
 const [items,setItems]=useState([]);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
   fetch("http://localhost:5000/api/products")
     .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not load products");setItems((d.products||[]).map(normalizeProduct));})
     .catch(e=>notify(e.message))
     .finally(()=>setLoading(false));
 },[]);
 if(loading) return <div className="live-empty"><ShoppingBag/><span>Loading live products from MongoDB…</span></div>;
 if(!items.length) return <div className="live-empty"><ShoppingBag/><span>No live products yet. Verified entrepreneurs can publish products from their dashboard.</span></div>;
 return <div className="live-product-wrap"><div className="live-services-head"><div><span className="section-kicker">Live products</span><h3>Handmade products from verified local sellers.</h3></div><span className="live-count">{items.length} product{items.length!==1?"s":""}</span></div><div className="live-product-grid">{items.slice(0,6).map(p=><article className="live-product-card" key={p.id} onClick={()=>openProduct(p)}><div className="live-product-image">{p.image?<img src={p.image} alt={p.name}/>:<div><ShoppingBag/></div>}<span>{p.category}</span></div><div className="live-product-copy"><h3>{p.name}</h3><p>{p.description||"Locally made product from a verified entrepreneur."}</p><small>{p.maker}</small><div><strong>₹{p.price.toLocaleString("en-IN")}</strong><span>{p.stock>0?`${p.stock} in stock`:"Out of stock"}</span></div></div></article>)}</div></div>
}

function Explore({openProfile,notify}){
  const backExplore=()=>{history.back();};
 const [q,setQ]=useState(""),[skill,setSkill]=useState("All skills"),[loc,setLoc]=useState("All locations"),[price,setPrice]=useState("Any price"),[sort,setSort]=useState("Newest");
 const [makers,setMakers]=useState([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{fetch("http://localhost:5000/api/entrepreneurs/public").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not load entrepreneurs");setMakers(d.entrepreneurs||[])}).catch(e=>notify(e.message)).finally(()=>setLoading(false));},[]);
 const filtered=useMemo(()=>{let list=makers.filter(e=>{const tags=Array.isArray(e.tags)?e.tags:[];const name=String(e.name||"");const skillValue=String(e.skill||"");const location=String(e.location||"");const priceValue=Number(e.price||0);const searchable=`${name} ${skillValue} ${tags.join(" ")}`.toLowerCase();return (!q||searchable.includes(q.toLowerCase()))&&(skill==="All skills"||skillValue===skill)&&(loc==="All locations"||location.startsWith(loc))&&(price==="Any price"||(price==="Under ₹300"&&priceValue<300)||(price==="₹300–₹500"&&priceValue>=300&&priceValue<=500));});return [...list].sort((a,b)=>sort==="Lowest price"?Number(a.price||0)-Number(b.price||0):sort==="Most reviewed"?Number(b.reviews||0)-Number(a.reviews||0):new Date(b.createdAt||0)-new Date(a.createdAt||0))},[makers,q,skill,loc,price,sort]);
 return <main><section className="explore-hero"><div className="container"><button className="back-btn" onClick={backExplore}><ArrowLeft/> Back</button><span className="section-kicker">Explore local talent</span><h1>Find someone who can <em>make it happen.</em></h1><p>Search verified local entrepreneurs by skill, location and starting price.</p></div></section>
  <section className="explore-section"><div className="container"><div className="filter-bar"><div className="explore-search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tailors, potters, artisans..."/></div><div className="filter-select"><SlidersHorizontal/><select value={skill} onChange={e=>setSkill(e.target.value)}><option>All skills</option>{["Tailor","Potter","Cobbler","Artisan","Small Vendor"].map(x=><option key={x}>{x}</option>)}</select></div><select value={loc} onChange={e=>setLoc(e.target.value)}><option>All locations</option><option>Hyderabad</option><option>Warangal</option><option>Secunderabad</option><option>Mancherial</option></select><select value={price} onChange={e=>setPrice(e.target.value)}><option>Any price</option><option>Under ₹300</option><option>₹300–₹500</option></select><select value={sort} onChange={e=>setSort(e.target.value)}><option>Newest</option><option>Lowest price</option><option>Most reviewed</option></select></div>
   <div className="results-head"><div><strong>{filtered.length}</strong> entrepreneurs found</div><span>Showing local makers near you</span></div>
   {loading?<div className="empty-state"><Search/><h3>Loading entrepreneurs…</h3><p>Fetching approved entrepreneurs from MongoDB.</p></div>:filtered.length?<div className="maker-grid explore-grid">{filtered.map(e=><MakerCard key={e.id||e._id} maker={e} openProfile={openProfile} notify={notify} showPrice/>)}</div>:<div className="empty-state"><Search/><h3>No entrepreneurs listed yet</h3><p>Approved entrepreneurs will appear here after they publish their profiles.</p></div>}
  </div></section><Footer/></main>
}

function MakerCard({maker,openProfile,notify,showPrice}){
 return <article className="maker-profile-card"><div className="card-image-wrap">{maker.image?<img src={maker.image} alt={maker.name}/>:<div className="maker-image-placeholder"><span>{(maker.name||"E")[0]}</span></div>}<button className="heart-btn" onClick={()=>notify("Saved feature will connect to your account later.")}><Heart/></button>{maker.verified&&<span className="verified-badge"><ShieldCheck/> Verified</span>}</div><div className="maker-body"><div className="maker-title-row"><div><h3>{maker.name}</h3><span>{maker.skill} · {maker.experience}</span></div><div className="rating"><Star fill="currentColor"/> {maker.rating}</div></div><div className="location-line"><MapPin/> {maker.location}</div><div className="tag-row">{maker.tags.map(t=><span key={t}>{t}</span>)}</div><div className="maker-footer"><small>{showPrice?`Starting from ₹${maker.price}`:`${maker.reviews} customer reviews`}</small><button onClick={()=>openProfile(maker)}>View profile <ArrowRight/></button></div></div></article>
}

function Profile({maker={},notify,back}){
 const [tab,setTab]=useState("services");
 const [requestService,setRequestService]=useState(null);
 const [reviews,setReviews]=useState([]); const [reviewSummary,setReviewSummary]=useState({rating:0,reviews:0}); const [reviewLoading,setReviewLoading]=useState(false);
 const services=Array.isArray(maker.services)?maker.services:[];
 const makerId=maker._id||maker.id;
 useEffect(()=>{
   if(!makerId)return;
   let active=true;
   if(tab==="reviews")setReviewLoading(true);
   fetch(`http://localhost:5000/api/reviews/entrepreneur/${makerId}`)
     .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not load reviews");if(active){setReviews(Array.isArray(d.reviews)?d.reviews:[]);setReviewSummary(d.summary||{rating:0,reviews:0})}})
     .catch(e=>{if(active)notify(e.message)})
     .finally(()=>{if(active)setReviewLoading(false)});
   return()=>{active=false};
 },[tab,makerId]);
 const products=Array.isArray(maker.products)?maker.products:[];
 const firstService=services[0]?.[0]||services[0]?.name||"";
 const safeName=maker.name||"Local entrepreneur";
 const request=()=>{if(firstService)setRequestService(firstService);else notify("This entrepreneur has not published a service yet.")};
 return <main><section className="profile-top"><div className="container"><button className="back-btn" onClick={back}><ArrowLeft/> Back to explore</button><div className="profile-header">{maker.image?<img src={maker.image} alt={safeName}/>:<div className="profile-image-placeholder"><span>{safeName[0]}</span></div>}<div className="profile-intro"><div className="profile-name-row"><div><div className="profile-kicker">{maker.skill||"Local skill"} <span>•</span> {maker.experience||"Experienced"}</div><h1>{safeName}</h1></div>{maker.verified&&<span className="verified-badge large"><ShieldCheck/> Verified</span>}</div><p>{maker.bio||"A local entrepreneur on HunarHub."}</p><div className="profile-meta"><span><MapPin/> {maker.location||"Local"}</span><span><Star fill="currentColor"/> {Number(reviewSummary.rating||0).toFixed(1)} ({Number(reviewSummary.reviews||0)} reviews)</span><span><Clock3/> Usually responds within 2 hrs</span></div><div className="profile-actions"><button className="btn btn-dark" onClick={request}><ArrowRight/> Request a service</button><button className="btn btn-outline" onClick={()=>notify("Message feature will be connected with authentication.")}><MessageCircle/> Message</button></div></div></div></div></section>
 <section className="profile-content"><div className="container profile-layout"><div className="profile-main"><div className="profile-tabs"><button className={tab==="services"?"active":""} onClick={()=>setTab("services")}>Services</button><button className={tab==="products"?"active":""} onClick={()=>setTab("products")}>Products</button><button className={tab==="reviews"?"active":""} onClick={()=>setTab("reviews")}>Reviews</button></div>
 {tab==="services"&&(services.length?<div className="service-list">{services.map((item,index)=>{const n=Array.isArray(item)?item[0]:item.name||"Service";const p=Array.isArray(item)?item[1]:`₹${Number(item.price||0).toLocaleString("en-IN")}`;return <div className="service-row" key={`${n}-${index}`}><div><span className="service-icon"><Award/></span><div><h3>{n}</h3><p>Professional service with transparent pricing and direct communication.</p></div></div><div className="service-price"><strong>{p}</strong><button onClick={()=>setRequestService(n)}>Request</button></div></div>})}</div>:<div className="empty-dashboard"><Award/><h3>No services published yet</h3><p>This entrepreneur has not published a service yet.</p></div>)}
 {tab==="products"&&(products.length?<div className="profile-product-grid">{products.map((item,index)=>{const n=Array.isArray(item)?item[0]:item.name||"Product";const p=Array.isArray(item)?item[1]:`₹${Number(item.price||0).toLocaleString("en-IN")}`;const img=Array.isArray(item)?item[2]:item.image;return <article className="profile-product" key={`${n}-${index}`}>{img?<img src={img} alt={n}/>:<div className="seller-product-placeholder"><ShoppingBag/></div>}<div><h3>{n}</h3><strong>{p}</strong><button onClick={()=>notify(`${n} selected.`)}><ShoppingBag/> View product</button></div></article>})}</div>:<div className="empty-dashboard"><ShoppingBag/><h3>No products published yet</h3><p>This entrepreneur has not published products yet.</p></div>)}
 {tab==="reviews"&&(reviewLoading?<div className="empty-dashboard"><MessageCircle/><h3>Loading reviews…</h3><p>Fetching verified customer feedback.</p></div>:reviews.length===0?<div className="empty-dashboard"><MessageCircle/><h3>No reviews yet</h3><p>Reviews will appear here after completed service transactions.</p></div>:<div className="service-list"><div style={{padding:"18px 0",borderBottom:"1px solid #e7ece6",marginBottom:"8px"}}><strong style={{fontSize:"28px"}}>{Number(reviewSummary.rating||0).toFixed(1)}</strong> <span><Star fill="currentColor"/> {reviewSummary.reviews} reviews</span></div>{reviews.map(r=><article className="dash-request" key={r._id}><div className="request-service-icon"><Star fill="currentColor"/></div><div className="dash-order-info"><span>{r.serviceId?.name||"Completed service"} · {r.createdAt?new Date(r.createdAt).toLocaleDateString("en-IN"):"Recent"}</span><h3>{r.customerId?.name||"Customer"}</h3><p>{r.comment||"No written comment."}</p></div><div className="dash-status-wrap"><strong>{"★".repeat(Number(r.rating)||0)}{"☆".repeat(Math.max(0,5-(Number(r.rating)||0)))}</strong></div></article>)}</div>)}
 </div><aside className="booking-card"><span className="section-kicker">Availability</span><h2>Ready to work</h2><div className="availability"><CheckCircle2/> Accepting new requests</div><div className="booking-detail"><CalendarDays/><div><strong>Flexible scheduling</strong><span>Choose a preferred date in your request.</span></div></div><div className="booking-detail"><IndianRupee/><div><strong>Starting from ₹{Number(maker.price||0).toLocaleString("en-IN")}</strong><span>Final price depends on the request.</span></div></div><button className="btn btn-dark full" onClick={request}><ArrowRight/> Request a service</button><p className="safe-note"><ShieldCheck/> Transparent profile · Direct local connection</p></aside></div></section>
 {requestService && <ServiceRequestModal maker={maker} service={requestService} onClose={()=>setRequestService(null)} notify={notify}/>}
 <Footer/></main>
}

function ServiceRequestModal({maker,service,onClose,notify,liveService}){
 const [date,setDate]=useState(""); const [time,setTime]=useState(""); const [message,setMessage]=useState(""); const [submitted,setSubmitted]=useState(false); const [requestId,setRequestId]=useState(""); const [loading,setLoading]=useState(false);
 const isLive=Boolean(liveService);
 const serviceName=isLive?liveService.name:service; const makerName=isLive?(liveService.entrepreneurId?.businessName||"Local entrepreneur"):maker.name; const location=isLive?(liveService.entrepreneurId?.location||"Local"):maker.location; const price=isLive?liveService.price:maker.price;
 const submit=async()=>{
   if(!date||!time){notify("Choose a preferred date and time.");return;}
   if(isLive){
     const token=localStorage.getItem("hh_token"); const user=JSON.parse(localStorage.getItem("hh_user")||"null");
     if(!token||user?.role!=="customer"){notify("Please sign in as a customer to request a service.");onClose();return;}
     setLoading(true);
     try{
       const res=await fetch("http://localhost:5000/api/service-requests",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({serviceId:liveService._id,requestedDate:`${date}T${time}`,message})});
       const data=await res.json(); if(!res.ok) throw new Error(data.message||"Could not send service request");
       setRequestId(`HH-REQ-${String(data.request._id).slice(-6).toUpperCase()}`); setSubmitted(true); notify("Service request sent successfully.");
     }catch(error){notify(error.message)}finally{setLoading(false)}
   }else{setSubmitted(true);setRequestId(`HH-${Math.floor(100000+Math.random()*899999)}`)}
 };
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="request-modal">
 {!submitted?<><div className="modal-head"><div><span className="section-kicker">Service request</span><h2>Request {serviceName}</h2><p>{makerName} · {location}</p></div><button className="modal-close" onClick={onClose}><X/></button></div>
 <div className="request-summary"><div className="request-avatar">{makerName[0]}</div><div><strong>{makerName}</strong><span><ShieldCheck/> Verified local entrepreneur</span></div><b>From ₹{price}</b></div>
 <div className="form-grid"><label><span>Preferred date</span><div className="input-icon"><CalendarDays/><input type="date" value={date} min={new Date().toISOString().split("T")[0]} onChange={e=>setDate(e.target.value)}/></div></label><label><span>Preferred time</span><div className="input-icon"><Clock3/><select value={time} onChange={e=>setTime(e.target.value)}><option value="">Select time</option><option value="09:00">09:00 AM</option><option value="11:00">11:00 AM</option><option value="13:00">01:00 PM</option><option value="15:00">03:00 PM</option><option value="17:00">05:00 PM</option><option value="19:00">07:00 PM</option></select></div></label></div>
 <label className="message-field"><span>Tell the entrepreneur what you need</span><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Add measurements, preferences, quantity, reference details, or any other information..." rows="5"/></label>
 <div className="request-note"><ShieldCheck/> Your request is sent directly to the entrepreneur. They can accept or reject it based on availability.</div><div className="modal-actions"><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-dark" onClick={submit} disabled={loading}>{loading?"Sending…":"Send service request"} {!loading&&<ArrowRight/>}</button></div></>
 :<div className="success-state"><div className="success-icon"><CheckCircle2/></div><span className="section-kicker">Request submitted</span><h2>Your request is on its way.</h2><p><strong>{makerName}</strong> will review your request for <strong>{serviceName}</strong>. Track its status from your Service Requests dashboard.</p><div className="request-id">Request ID <strong>{requestId}</strong></div><button className="btn btn-dark full" onClick={onClose}>Done</button></div>}
 </div></div>
}

function LiveServices({notify}={}){
 const [services,setServices]=useState([]); const [loading,setLoading]=useState(true); const [selected,setSelected]=useState(null);
 useEffect(()=>{fetch("http://localhost:5000/api/services").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not load services");setServices(d.services||[])}).catch(e=>notify?.(e.message)).finally(()=>setLoading(false));},[]);
 return <div className="container live-services-block">
  {loading?<div className="empty-state home-empty"><Award/><h3>Loading live services…</h3><p>Fetching services published by approved entrepreneurs.</p></div>:services.length===0?<div className="empty-state home-empty"><Award/><h3>No live services yet</h3><p>Approved entrepreneurs will appear here after they publish a service.</p></div>:<div className="service-card-grid">{services.map(s=><article className="service-card" key={s._id}><div className="service-card-icon"><Award/></div><div><span>{s.category||"Local service"}</span><h3>{s.name}</h3><p>{s.description||"Direct service from a verified local entrepreneur."}</p><small><MapPin/> {s.entrepreneurId?.location||s.entrepreneurId?.userId?.city||"Local"}</small><strong>From ₹{s.price}</strong></div><button className="btn btn-dark mini-btn" onClick={()=>setSelected(s)}>Request service <ArrowRight/></button></article>)}</div>}
  {selected&&<ServiceRequestModal liveService={selected} service={selected.name} onClose={()=>setSelected(null)} notify={notify}/>} 
 </div>
}

function ProductCard({product,notify,openProduct}){return <article className="product-card"><div className="product-image">{product.image?<img src={product.image} alt={product.name}/>:<div className="seller-product-placeholder"><ShoppingBag/></div>}<span>{product.category}</span></div><div className="product-info"><div><h3>{product.name}</h3><p>{product.maker}</p></div><strong>{product.price}</strong></div><button className="outline-full" onClick={()=>openProduct(product)}><ShoppingBag/> View details</button></article>}





function LoginPage({nav,notify,setAuthUser}){
 const [mode,setMode]=useState("login");
 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [loading,setLoading]=useState(false);
 const [signupRole,setSignupRole]=useState("customer");
 const submit=async e=>{
   e.preventDefault();
   if(!email.trim()||!password.trim()||(mode==="signup"&&!name.trim())){
     notify("Please fill all required fields."); return;
   }
      setLoading(true);
   try{
     const endpoint=mode==="login"
       ?"http://localhost:5000/api/auth/login"
       :"http://localhost:5000/api/auth/register";
     const body=mode==="login"?{email,password}:{name,email,password,role:signupRole};
     const res=await fetch(endpoint,{
       method:"POST",
       headers:{"Content-Type":"application/json"},
       body:JSON.stringify(body)
     });
     const data=await res.json();
     if(!res.ok) throw new Error(data.message||"Authentication failed");
     localStorage.setItem("hh_token",data.token);
     localStorage.setItem("hh_user",JSON.stringify(data.user));
     setAuthUser(data.user);
     notify(mode==="login"?"Welcome back to HunarHub.":"Your HunarHub account is ready.");
     nav(data.user.role);
   }catch(err){
     notify(err.message||"Could not connect to the backend.");
   }finally{
     setLoading(false);
   }
 };

 return <main className="auth-page">
   <section className="auth-modern">
     <div className="auth-panel auth-panel-left">
       <button className="auth-back" onClick={()=>nav("home")}><ArrowLeft/> Back to marketplace</button>
       <div className="auth-left-content">
         <button className="auth-logo" onClick={()=>nav("home")}><span className="brand-mark">H</span><span>Hunar<span>Hub</span></span></button>
         <span className="auth-kicker">LOCAL TALENT. ONE COMMUNITY.</span>
         <h1>Welcome to<br/><em>HunarHub.</em></h1>
         <div className="auth-rule"/>
         <p>Connect with skilled local entrepreneurs, discover handmade products and support the people behind the craft.</p>
       </div>
       <div className="auth-left-footer"><span>Digital marketplace for local micro-entrepreneurs</span><span>© 2026 HunarHub</span></div>
     </div>

     <div className="auth-panel auth-panel-right">
       <div className="auth-form-wrap">
         <div className="auth-mobile-back"><button onClick={()=>nav("home")}><ArrowLeft/> Back</button></div>
         <div className="auth-form-top">
           <span className="auth-kicker">{mode==="login"?"ACCOUNT ACCESS":"CREATE YOUR ACCOUNT"}</span>
         </div>
         <h2>{mode==="login"?"Sign in":"Create your account"}</h2>
         <p className="auth-form-sub">{mode==="login"?"Use your HunarHub account to continue.":"Join HunarHub and start exploring local talent."}</p>

         {mode==="signup"&&<div className="auth-role-picker">
           <span>Account type</span>
           <div className="auth-role-options">
             <button type="button" className={signupRole==="customer"?"auth-role-option active":"auth-role-option"} onClick={()=>setSignupRole("customer")}>
               <UserRound/><span><strong>Customer</strong><small>Shop products and request services</small></span>
             </button>
             <button type="button" className={signupRole==="entrepreneur"?"auth-role-option active":"auth-role-option"} onClick={()=>setSignupRole("entrepreneur")}>
               <Store/><span><strong>Entrepreneur</strong><small>Create a business profile</small></span>
             </button>
           </div>
         </div>}

         <form onSubmit={submit} className="auth-modern-form">
           {mode==="signup"&&<label><span>Full name</span><div className="auth-input"><UserRound/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your full name"/></div></label>}
           <label><span>Email address</span><div className="auth-input"><MessageCircle/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></div></label>
           <label><span>Password</span><div className="auth-input"><ShieldCheck/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" minLength="6" autoComplete={mode==="login"?"current-password":"new-password"}/></div></label>

           {mode==="login"&&<div className="auth-helper"><span>Secure sign in</span><span>JWT protected</span></div>}

           <button className="auth-submit" type="submit" disabled={loading}>
             <span>{loading?"Please wait…":mode==="login"?"Sign in":"Create account"}</span>
             {!loading&&<ArrowRight/>}
           </button>
         </form>

         <div className="auth-or"><span>or</span></div>
         <div className="auth-switch-modern">
           <span>{mode==="login"?"Don't have an account yet?":"Already have a HunarHub account?"}</span>
           <button type="button" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Create account":"Sign in"}</button>
         </div>

         {mode==="login"&&<div className="auth-security"><ShieldCheck/><span>Your credentials are securely checked by the HunarHub backend.</span></div>}
       </div>
     </div>
   </section>
 </main>
}
function CategoriesTab({notify}){
  const [categories,setCategories]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");

  const token=localStorage.getItem("hh_token");
  const headers={Authorization:`Bearer ${token}`};

  const load=async()=>{
    setLoading(true);
    try{
      const urls=[
        "http://localhost:5000/api/admin/categories",
        "http://localhost:5000/api/categories"
      ];
      let lastError=null;
      for(const url of urls){
        try{
          const res=await fetch(url,{headers});
          const data=await res.json();
          if(res.ok){
            setCategories(data.categories||data.items||[]);
            return;
          }
          lastError=new Error(data.message||`Could not load categories (${res.status})`);
        }catch(error){lastError=error}
      }
      throw lastError||new Error("Could not load categories");
    }catch(error){
      setCategories([]);
      notify(error.message||"Categories could not be loaded.");
    }finally{setLoading(false)}
  };

  useEffect(()=>{load()},[]);

  const add=async()=>{
    if(!name.trim()){notify("Enter a category name.");return}
    setSaving(true);
    try{
      const payload={name:name.trim(),description:description.trim(),active:true};
      const urls=[
        "http://localhost:5000/api/admin/categories",
        "http://localhost:5000/api/categories"
      ];
      let lastError=null;
      for(const url of urls){
        try{
          const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify(payload)});
          const data=await res.json();
          if(res.ok){
            setCategories(v=>[data.category||data.item||payload,...v]);
            setName("");setDescription("");
            notify("Category created.");
            return;
          }
          lastError=new Error(data.message||`Could not create category (${res.status})`);
        }catch(error){lastError=error}
      }
      throw lastError||new Error("Could not create category");
    }catch(error){notify(error.message||"Could not create category")}
    finally{setSaving(false)}
  };

  const toggle=async(category)=>{
    const id=category._id||category.id;
    if(!id){notify("This category has no database id.");return}
    try{
      const next=!((category.active??category.status!=="inactive"));
      const urls=[
        `http://localhost:5000/api/admin/categories/${id}`,
        `http://localhost:5000/api/categories/${id}`
      ];
      let lastError=null;
      for(const url of urls){
        try{
          const res=await fetch(url,{method:"PATCH",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify({active:next})});
          const data=await res.json();
          if(res.ok){
            const updated=data.category||data.item||{...category,active:next};
            setCategories(v=>v.map(x=>(x._id||x.id)===id?{...x,...updated,active:next}:x));
            notify(next?"Category activated.":"Category deactivated.");
            return;
          }
          lastError=new Error(data.message||`Could not update category (${res.status})`);
        }catch(error){lastError=error}
      }
      throw lastError||new Error("Could not update category");
    }catch(error){notify(error.message||"Could not update category")}
  };

  return <div>
    <div className="dash-title">
      <div><span className="section-kicker">Marketplace taxonomy</span><h2>Categories & Skills</h2></div>
    </div>

    <div className="inline-form" style={{marginBottom:"18px"}}>
      <h3>Add category</h3>
      <div><input value={name} onChange={e=>setName(e.target.value)} placeholder="Category name"/><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Short description"/></div>
      <button className="btn btn-dark mini-btn" onClick={add} disabled={saving}>{saving?"Saving…":"Create category"}</button>
    </div>

    {loading
      ? <div className="empty-dashboard"><Award/><h3>Loading categories…</h3><p>Fetching category data from the admin API.</p></div>
      : categories.length===0
        ? <div className="empty-dashboard"><Award/><h3>No categories found</h3><p>If your backend has no category records yet, create the first one above.</p><button className="btn btn-dark mini-btn" onClick={load}>Retry</button></div>
        : <div className="manage-grid">{categories.map(c=>{
            const id=c._id||c.id;
            const active=c.active!==false&&c.status!=="inactive";
            return <article className="manage-card" key={id||c.name}>
              <div className="manage-icon"><Award/></div>
              <div><h3>{c.name}</h3><small>{c.description||"No description added."}</small></div>
              <button onClick={()=>toggle(c)}>{active?"Deactivate":"Activate"}</button>
            </article>
        })}</div>}
  </div>
}

function ComplaintsTab({complaints=[],loading,resolve,retry}){
  return <div>
    <div className="dash-title">
      <div><span className="section-kicker">Trust & safety</span><h2>Complaints</h2></div>
      <button className="btn btn-ghost mini-btn" onClick={retry}>Refresh</button>
    </div>

    {loading
      ? <div className="empty-dashboard"><MessageCircle/><h3>Loading complaints…</h3><p>Fetching customer issues from the admin API.</p></div>
      : complaints.length===0
        ? <div className="empty-dashboard"><MessageCircle/><h3>No complaints found</h3><p>There are no complaints available for the admin account right now.</p></div>
        : <div className="seller-request-list">{complaints.map(c=>{
            const id=c._id||c.id;
            const status=c.status||"Open";
            return <article className="seller-request" key={id||c.createdAt}>
              <div className="request-service-icon"><MessageCircle/></div>
              <div className="dash-order-info">
                <span>{c.createdAt?new Date(c.createdAt).toLocaleString("en-IN"):"Recent"} · {c.targetType||"Marketplace complaint"}</span>
                <h3>{c.reason||c.title||"Customer complaint"}</h3>
                <p>{c.description||"No description provided."}</p>
                <small>{c.userId?.name||c.user?.name||"User"} · {c.userId?.email||c.user?.email||""}</small>
                {c.resolution&&<small className="request-message">Resolution: {c.resolution}</small>}
              </div>
              <div className="seller-request-actions">
                <span className={`status ${String(status).toLowerCase()}`}>{status}</span>
                {String(status).toLowerCase()!=="resolved"&&<button className="accept-btn" onClick={()=>resolve(id)}><CheckCircle2/> Resolve</button>}
              </div>
            </article>
        })}</div>}
  </div>
}

function AdminDashboard({nav,notify}){
  const [tab,setTab]=useState("overview");
  const [verification,setVerification]=useState([]);
  const [verificationLoading,setVerificationLoading]=useState(true);
  const [users,setUsers]=useState([]);
  const [userActionId,setUserActionId]=useState("");
  const [orders,setOrders]=useState([]);
  const [complaints,setComplaints]=useState([]);
  const [complaintsLoading,setComplaintsLoading]=useState(true);

  const token=localStorage.getItem("hh_token");
  const authHeaders={Authorization:`Bearer ${token}`};

  const loadVerification=async()=>{
    try{
      const res=await fetch("http://localhost:5000/api/entrepreneurs/admin/verification",{headers:authHeaders});
      const data=await res.json();
      if(!res.ok) throw new Error(data.message||"Could not load verification requests");
      setVerification(data.profiles||[]);
    }catch(error){notify(error.message)}
    finally{setVerificationLoading(false)}
  };

  const loadUsers=async()=>{
    try{
      const res=await fetch("http://localhost:5000/api/admin/users",{headers:authHeaders});
      const data=await res.json();
      if(!res.ok) throw new Error(data.message||"Could not load users");
      setUsers(data.users||[]);
    }catch(error){notify(error.message)}
  };

  const toggleUser=async(user)=>{
    if(!user?.id || user.role==="admin" || user.status==="Inactive") return;
    const nextSuspended=user.status!=="Suspended";
    const action=nextSuspended?"suspend":"reactivate";
    if(!window.confirm(`Are you sure you want to ${action} ${user.name}?`)) return;
    setUserActionId(user.id);
    try{
      const res=await fetch(`http://localhost:5000/api/admin/users/${user.id}/status`,{
        method:"PATCH",
        headers:{"Content-Type":"application/json",...authHeaders},
        body:JSON.stringify({suspended:nextSuspended})
      });
      const data=await res.json();
      if(!res.ok) throw new Error(data.message||`Could not ${action} user`);
      setUsers(current=>current.map(item=>item.id===user.id?data.user:item));
      notify(nextSuspended?"User suspended successfully.":"User reactivated successfully.");
    }catch(error){notify(error.message||"User status update failed.")}
    finally{setUserActionId("")}
  };
 const loadOrders=async()=>{
    try{
      const res=await fetch("http://localhost:5000/api/orders/admin",{headers:authHeaders});
      const data=await res.json();
      if(!res.ok) throw new Error(data.message||"Could not load orders");
      setOrders(data.orders||[]);
    }catch(error){notify(error.message)}
  };

  const loadComplaints=async()=>{
    setComplaintsLoading(true);
    try{
      const urls=[
        "http://localhost:5000/api/complaints/admin",
        "http://localhost:5000/api/complaints"
      ];
      let lastError=null;
      for(const url of urls){
        try{
          const res=await fetch(url,{headers:authHeaders});
          const data=await res.json();
          if(res.ok){
            setComplaints(data.complaints||data.items||[]);
            return;
          }
          lastError=new Error(data.message||`Could not load complaints (${res.status})`);
        }catch(error){lastError=error}
      }
      throw lastError||new Error("Could not load complaints");
    }catch(error){
      setComplaints([]);
      notify(error.message||"Complaints could not be loaded.");
    }finally{
      setComplaintsLoading(false);
    }
  };

  useEffect(()=>{loadVerification();loadUsers();loadOrders();loadComplaints()},[]);

  const updateVerification=async(id,status)=>{
    try{
      const res=await fetch(`http://localhost:5000/api/entrepreneurs/admin/verification/${id}`,{
        method:"PATCH",
        headers:{"Content-Type":"application/json",...authHeaders},
        body:JSON.stringify({status})
      });
      const data=await res.json();
      if(!res.ok) throw new Error(data.message||"Could not update verification");
      setVerification(v=>v.map(x=>x._id===id?data.profile:x));
      notify(status==="approved"?"Entrepreneur approved and verified.":"Verification rejected.");
    }catch(error){notify(error.message)}
  };

  const approve=id=>updateVerification(id,"approved");
  const reject=id=>updateVerification(id,"rejected");

  const resolve=async(id)=>{
    try{
      const urls=[
        `http://localhost:5000/api/complaints/${id}/status`,
        `http://localhost:5000/api/complaints/${id}`
      ];
      let done=false,lastError=null;
      for(const url of urls){
        try{
          const res=await fetch(url,{
            method:"PATCH",
            headers:{"Content-Type":"application/json",...authHeaders},
            body:JSON.stringify({status:"Resolved",resolution:"Resolved by HunarHub admin"})
          });
          const data=await res.json();
          if(res.ok){
            const updated=data.complaint||data.item||{_id:id,id,status:"Resolved",resolution:"Resolved by HunarHub admin"};
            setComplaints(v=>v.map(x=>(x._id===id||x.id===id)?{...x,...updated,status:"Resolved"}:x));
            notify("Complaint resolved.");
            done=true;
            break;
          }
          lastError=new Error(data.message||`Could not resolve complaint (${res.status})`);
        }catch(error){lastError=error}
      }
      if(!done) throw lastError||new Error("Could not resolve complaint");
    }catch(error){
      notify(error.message||"Could not resolve complaint.");
    }
  };

  const openComplaints=complaints.filter(x=>(x.status||"Open").toLowerCase()==="open").length;

  return <main>
   <section className="dashboard-head admin-head"><div className="container dashboard-head-inner"><div><span className="section-kicker">Platform administration</span><h1>HunarHub control center.</h1><p>Monitor the marketplace, verify entrepreneurs and keep the community safe.</p></div><div className="admin-badge"><ShieldCheck/><span>Admin</span></div></div></section>
   <section className="dashboard-section"><div className="container dashboard-layout">
    <aside className="dashboard-sidebar admin-sidebar">
      <div className="dash-user"><div className="dash-avatar small admin-avatar">H</div><div><strong>HunarHub Admin</strong><span>Platform administrator</span></div></div>
      <nav className="dash-nav">{[["overview","Overview"],["verification","Verification"],["users","Users"],["orders","Orders"],["categories","Categories"],["complaints","Complaints"],["analytics","Analytics"]].map(([key,label])=><button className={tab===key?"active":""} key={key} onClick={()=>setTab(key)}>{label}{key==="verification"&&<b>{verification.filter(x=>(x.verificationStatus||"pending")==="pending").length}</b>}{key==="complaints"&&openComplaints>0&&<b>{openComplaints}</b>}</button>)}</nav>
      <button className="dash-logout" onClick={()=>nav("home")}>← Back to marketplace</button>
    </aside>
    <div className="dashboard-main">
      {tab==="overview"&&<AdminOverview verification={verification} users={users} orders={orders} complaints={complaints} setTab={setTab}/>} 
      {tab==="verification"&&<VerificationTab verification={verification} approve={approve} reject={reject} loading={verificationLoading}/>}
      {tab==="users"&&<UsersTab users={users} toggleUser={toggleUser} userActionId={userActionId}/>} 
      {tab==="orders"&&<AdminOrders orders={orders}/>}
      {tab==="categories"&&<CategoriesTab notify={notify}/>}
      {tab==="complaints"&&<ComplaintsTab complaints={complaints} loading={complaintsLoading} resolve={resolve} retry={loadComplaints}/>}
      {tab==="analytics"&&<AdminAnalytics verification={verification}/>}
    </div>
   </div></section><Footer/>
  </main>
}

function AdminOverview({verification,users=[],orders,complaints,setTab}){
 const pending=verification.filter(x=>(x.verificationStatus||"pending")==="pending").length;
 const open=complaints.filter(x=>String(x.status||"Open").toLowerCase()==="open").length;
 const delivered=orders.filter(o=>String(o.status||"").toLowerCase()==="delivered");
 const revenue=delivered.reduce((sum,o)=>sum+Number(o.total||0),0);
 return <div><div className="dash-title"><div><span className="section-kicker">Platform overview</span><h2>Good evening, Admin.</h2></div><span className="admin-live"><span/> System healthy</span></div>
 <div className="stat-grid"><div><span>Total users</span><strong>{users.length}</strong><small>Real platform accounts.</small></div><div><span>Entrepreneurs</span><strong>{verification.length}</strong><small>Profiles currently returned by MongoDB.</small></div><div><span>Orders</span><strong>{orders.length}</strong><small>Real product orders.</small></div><div><span>Delivered sales</span><strong>₹{revenue.toLocaleString("en-IN")}</strong><small>{delivered.length} completed product order{delivered.length===1?"":"s"}.</small></div></div>
 <div className="admin-alerts"><button onClick={()=>setTab("verification")}><ShieldCheck/><div><strong>{pending} entrepreneur verifications pending</strong><span>Review applications and approve verified makers.</span></div><ArrowRight/></button><button onClick={()=>setTab("complaints")}><MessageCircle/><div><strong>{open} open complaints</strong><span>Some customer issues need attention.</span></div><ArrowRight/></button></div>
 <div className="dash-section-title"><h3>Recent platform orders</h3><button onClick={()=>setTab("orders")}>View all <ArrowRight/></button></div>
 {orders.length===0?<div className="empty-dashboard"><ShoppingBag/><h3>No orders yet</h3><p>Orders will appear here after customers place product orders.</p></div>:<div className="dashboard-list">{orders.slice(0,6).map(o=>{const id=o._id||o.id;const date=o.createdAt?new Date(o.createdAt).toLocaleDateString("en-IN"):"Recent";const customer=o.customerId?.name||"Customer";const maker=o.entrepreneurId?.businessName||"Entrepreneur";return <article className="dash-order" key={id}><div className="seller-order-icon"><ShoppingBag/></div><div className="dash-order-info"><span>{date} · {o.orderId||id}</span><h3>{maker}</h3><p>Customer: {customer}</p><strong>₹{Number(o.total||0).toLocaleString("en-IN")}</strong></div><div className="dash-status-wrap"><span className={`status ${String(o.status||"pending").toLowerCase()}`}>{o.status||"pending"}</span></div></article>})}</div>}
 </div>
}
function VerificationTab({verification,approve,reject,loading}){
 return <div>
  <div className="dash-title"><div><span className="section-kicker">Trust & safety</span><h2>Entrepreneur Verification</h2></div></div>
  {loading?<div className="empty-dashboard"><ShieldCheck/><h3>Loading applications…</h3><p>Fetching entrepreneur profiles from MongoDB.</p></div>:
  verification.length===0?<div className="empty-dashboard"><ShieldCheck/><h3>No applications yet</h3><p>New entrepreneur profiles will appear here after registration.</p></div>:
  <div className="verification-list">{verification.map(v=>{
    const status=(v.verificationStatus||"pending").toLowerCase();
    const name=v.businessName||v.userId?.name||"Unnamed business";
    const submitted=v.createdAt?new Date(v.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"Recently";
    return <article className="verification-card" key={v._id}>
      <div className="verify-avatar">{name[0]}</div>
      <div className="verify-info">
        <span>{submitted} · Application</span>
        <h3>{name}</h3>
        <p>{v.skill} · {v.location} · {v.userId?.email||"No email"}</p>
        <small className="verification-description">{v.description||"No business description provided."}</small>
      </div>
      <span className={`status ${status}`}>{status}</span>
      {status==="pending"&&<div className="verify-actions">
        <button className="accept-btn" onClick={()=>approve(v._id)}><CheckCircle2/> Approve</button>
        <button className="reject-btn" onClick={()=>reject(v._id)}>Reject</button>
      </div>}
    </article>
  })}</div>}
 </div>
}
function UsersTab({users,toggleUser,userActionId}){
 return <div>
  <div className="dash-title"><div><span className="section-kicker">Platform accounts</span><h2>Users</h2></div><span>{users.length} accounts</span></div>
  {users.length?<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Account</th><th>Role</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.map(u=><tr key={u.id}>
    <td><strong>{u.name}</strong><span>{u.email}</span></td><td>{u.role}</td><td>{u.joined}</td>
    <td><span className={`user-status ${String(u.status||"Active").toLowerCase()}`}>{u.status||"Active"}</span></td>
    <td>{u.role==="admin"?<span>Protected</span>:u.status==="Inactive"?<span>Deleted account</span>:<button className="user-status-action" disabled={userActionId===u.id} onClick={()=>toggleUser(u)}>{userActionId===u.id?"Saving…":u.status==="Suspended"?"Reactivate":"Suspend"}</button>}</td>
  </tr>)}</tbody></table></div>:<div className="empty-dashboard"><Users/><h3>No users found</h3><p>No platform accounts are currently available.</p></div>}
 </div>
}
function AdminOrders({orders}){return <div><div className="dash-title"><div><span className="section-kicker">Marketplace activity</span><h2>Orders</h2></div></div>{orders.length?<div className="admin-table-wrap"><table className="admin-table"><tbody>{orders.map(o=><tr key={o.id||o._id}><td><strong>{o.orderId||o.id}</strong><span>{o.createdAt?new Date(o.createdAt).toLocaleDateString("en-IN"):"Recent"}</span></td><td>{o.customerId?.name||"Customer"}</td><td>{o.entrepreneurId?.businessName||"Entrepreneur"}</td><td><strong>₹{Number(o.total||0).toLocaleString("en-IN")}</strong></td><td>{o.status}</td></tr>)}</tbody></table></div>:<div className="empty-dashboard"><ShoppingBag/><h3>No orders yet</h3><p>Orders will appear here after customers place product orders.</p></div>}</div>}
function AdminAnalytics({verification=[]}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let active=true;const load=async()=>{try{const token=localStorage.getItem("hh_token");const res=await fetch("http://localhost:5000/api/admin/analytics",{headers:{Authorization:`Bearer ${token}`}});const json=await res.json();if(!res.ok)throw new Error(json.message||"Could not load analytics");if(active)setData(json.analytics||null);}catch(e){if(active)setError(e.message||"Could not load analytics");}finally{if(active)setLoading(false);}};load();return()=>{active=false}},[]);
 if(loading)return <div><div className="dash-title"><div><span className="section-kicker">Platform performance</span><h2>Analytics</h2></div></div><div className="empty-dashboard"><Award/><h3>Loading analytics…</h3><p>Calculating platform activity from MongoDB.</p></div></div>;
 if(error)return <div><div className="dash-title"><div><span className="section-kicker">Platform performance</span><h2>Analytics</h2></div></div><div className="empty-dashboard"><Award/><h3>Could not load analytics</h3><p>{error}</p></div></div>;
 const money=v=>`₹${Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:0})}`;
 const monthly=data?.monthly||[];const max=Math.max(...monthly.map(x=>Number(x.sales||0)),1);
 return <div><div className="dash-title"><div><span className="section-kicker">Platform performance</span><h2>Analytics</h2></div></div><div className="admin-analytics-grid"><div><span>Customer satisfaction</span><strong>{data?.customerSatisfaction==null?"—":`${Number(data.customerSatisfaction).toFixed(1)}/5`}</strong><small>{data?.reviewCount||0} published review{data?.reviewCount===1?"":"s"}</small></div><div><span>Service conversion</span><strong>{data?.serviceConversion==null?"—":`${Number(data.serviceConversion).toFixed(1)}%`}</strong><small>{data?.completedRequests||0} completed / {data?.serviceRequests||0} total requests</small></div><div><span>Active entrepreneurs</span><strong>{data?.activeEntrepreneurs??verification.length}</strong><small>Approved and visible profiles.</small></div><div><span>Average delivered order</span><strong>{money(data?.averageOrderValue)}</strong><small>{data?.deliveredOrders||0} delivered product orders.</small></div></div><div className="analytics-panel"><h3>Monthly product sales</h3>{monthly.length===0?<div className="empty-dashboard"><Award/><h3>No sales yet</h3><p>Monthly sales will populate automatically after orders are delivered.</p></div>:<div className="analytics-bars">{monthly.map(item=><div key={`${item.year}-${item.month}`}><span style={{height:`${Math.max(4,(Number(item.sales||0)/max)*100)}%`}} title={money(item.sales)}/><small>{item.label}</small></div>)}</div>}</div></div>
}
function EntrepreneurDashboard({nav,notify,deleteMyAccount}){
 const [tab,setTab]=useState("overview");
 const [available,setAvailable]=useState(true);
 const [profile,setProfile]=useState(null);
 const [profileLoading,setProfileLoading]=useState(true);
 const [profileForm,setProfileForm]=useState({businessName:"",skill:"",location:"",experience:"",description:"",profileImage:""});
 const loadProfile=async()=>{
   try{
     const token=localStorage.getItem("hh_token");

     const res=await fetch("http://localhost:5000/api/entrepreneurs/profile",{headers:{Authorization:`Bearer ${token}`}});
     const data=await res.json();
     if(!res.ok) throw new Error(data.message||"Could not load entrepreneur profile");
     setProfile(data.profile);
     if(data.profile){
       setAvailable(data.profile.available);
       setProfileForm({
         businessName:data.profile.businessName||"",
         skill:data.profile.skill||"",
         location:data.profile.location||"",
         experience:data.profile.experience??"",
         description:data.profile.description||"",
         profileImage:data.profile.profileImage||""
       });
     }
   }catch(error){notify(error.message);}
   finally{setProfileLoading(false);}
 };
 useEffect(()=>{loadProfile();},[]);
 const saveProfile=async()=>{
   if(!profileForm.businessName||!profileForm.skill||!profileForm.location){
     notify("Business name, skill and location are required."); return;
   }
   try{
     const token=localStorage.getItem("hh_token");
     const method=profile?"PATCH":"POST";
     const url="http://localhost:5000/api/entrepreneurs/profile";
     const res=await fetch(url,{method,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(profileForm)});
     const data=await res.json();
     if(!res.ok) throw new Error(data.message||"Could not save profile");
     setProfile(data.profile);
     notify(profile?"Business profile updated.":"Profile submitted for admin verification.");
   }catch(error){notify(error.message);}
 };
 const toggleAvailability=async()=>{
   try{
     const token=localStorage.getItem("hh_token");
     const next=!available;
     const res=await fetch("http://localhost:5000/api/entrepreneurs/availability",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({available:next})});
     const data=await res.json();
     if(!res.ok) throw new Error(data.message||"Could not update availability");
     setAvailable(data.profile.available);
     notify(data.profile.available?"You are now available.":"New requests paused.");
   }catch(error){notify(error.message);}
 };
 const [products,setProducts]=useState([]);
 const [services,setServices]=useState([]);
 const [serviceLoading,setServiceLoading]=useState(true);
 const [requests,setRequests]=useState([]);
 const [requestLoading,setRequestLoading]=useState(true);
 const [orders,setOrders]=useState([]);
 const [showProduct,setShowProduct]=useState(false),[showService,setShowService]=useState(false);
 const token=localStorage.getItem("hh_token");
 const loadOrders=async()=>{try{const res=await fetch("http://localhost:5000/api/orders/entrepreneur",{headers:{Authorization:`Bearer ${token}`}});const data=await res.json();if(!res.ok)throw new Error(data.message||"Could not load orders");setOrders(data.orders||[])}catch(error){notify(error.message)}};
 const loadServices=async()=>{
   try{
     const res=await fetch("http://localhost:5000/api/services/mine",{headers:{Authorization:`Bearer ${token}`} });
     const data=await res.json(); if(!res.ok) throw new Error(data.message||"Could not load services");
     setServices(data.services||[]);
   }catch(error){notify(error.message)}finally{setServiceLoading(false)}
 };
 const loadRequests=async()=>{
   try{
     const res=await fetch("http://localhost:5000/api/service-requests/entrepreneur",{headers:{Authorization:`Bearer ${token}`} });
     const data=await res.json(); if(!res.ok) throw new Error(data.message||"Could not load service requests");
     setRequests(data.requests||[]);
   }catch(error){notify(error.message)}finally{setRequestLoading(false)}
 };
 const loadProducts=async()=>{
   try{
     const res=await fetch("http://localhost:5000/api/products/mine",{headers:{Authorization:`Bearer ${token}`} });
     const data=await res.json(); if(!res.ok) throw new Error(data.message||"Could not load products");
     setProducts((data.products||[]).map(normalizeProduct));
   }catch(error){notify(error.message)}
 };
 useEffect(()=>{loadServices();loadRequests();loadProducts();loadOrders()},[]);
 const addService=async(payload)=>{
   try{
     const res=await fetch("http://localhost:5000/api/services",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
     const data=await res.json(); if(!res.ok) throw new Error(data.message||"Could not add service");
     setServices(v=>[data.service,...v]); setShowService(false); notify("Service saved to MongoDB.");
   }catch(error){notify(error.message)}
 };
 const deleteService=async(id)=>{
   try{
     const res=await fetch(`http://localhost:5000/api/services/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
     const data=await res.json(); if(!res.ok) throw new Error(data.message||"Could not delete service");
     setServices(v=>v.filter(x=>x._id!==id)); notify("Service deleted.");
   }catch(error){notify(error.message)}
 };
 const addProduct=async(payload)=>{
   try{
     const res=await fetch("http://localhost:5000/api/products",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
     const data=await res.json(); if(!res.ok) throw new Error(data.message||"Could not add product");
     setProducts(v=>[normalizeProduct(data.product),...v]); setShowProduct(false); notify("Product saved to MongoDB.");
   }catch(error){notify(error.message)}
 };
 const deleteProduct=async(id)=>{
   try{
     const res=await fetch(`http://localhost:5000/api/products/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
     const data=await res.json(); if(!res.ok) throw new Error(data.message||"Could not delete product");
     setProducts(v=>v.filter(x=>x.id!==id&&x._id!==id)); notify("Product deleted.");
   }catch(error){notify(error.message)}
 };
 const updateOrder=async(id,status)=>{try{const res=await fetch(`http://localhost:5000/api/orders/${id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({status})});const data=await res.json();if(!res.ok)throw new Error(data.message||"Could not update order");setOrders(v=>v.map(x=>x._id===id||x.id===id?data.order:x));notify(`Order ${status}.`)}catch(error){notify(error.message)}};
 const updateRequest=async(id,status)=>{
   try{
     const res=await fetch(`http://localhost:5000/api/service-requests/${id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({status})});
     const data=await res.json(); if(!res.ok) throw new Error(data.message||"Could not update request");
     setRequests(v=>v.map(x=>x._id===id?data.request:x)); notify(status==="accepted"?"Service request accepted.":status==="rejected"?"Service request rejected.":"Service marked completed.");
   }catch(error){notify(error.message)}
 };
 const acceptRequest=id=>updateRequest(id,"accepted");
 const rejectRequest=id=>updateRequest(id,"rejected");
 const completeRequest=id=>updateRequest(id,"completed");
 const displayName=profile?.businessName||profileForm.businessName||"Your business";
 const displaySkill=profile?.skill||profileForm.skill||"Entrepreneur";
 const displayLocation=profile?.location||profileForm.location||"Add your location";
 const verificationLabel=profile?.verificationStatus==="approved"?"Verified entrepreneur":profile?.verificationStatus==="rejected"?"Verification rejected":"Verification pending";
 return <main>
  <section className="dashboard-head entrepreneur-head"><div className="container dashboard-head-inner"><div><span className="section-kicker">Entrepreneur account</span><h1>{profileLoading?"Loading your storefront…":`Welcome, ${displayName}.`}</h1><p>{profile?"Manage your local business, requests, products and earnings.":"Create your business profile first so customers and admins can see you."}</p></div><div className="business-head"><div className="dash-avatar">{displayName[0]||"E"}</div><div><strong>{displayName}</strong><span><ShieldCheck/> {verificationLabel}</span></div></div></div></section>
  <section className="dashboard-section"><div className="container dashboard-layout">
   <aside className="dashboard-sidebar">
    <div className="dash-user"><div className="dash-avatar small">{displayName[0]||"E"}</div><div><strong>{displayName}</strong><span>{displaySkill} · {displayLocation}</span></div></div>
    <nav className="dash-nav entrepreneur-nav">{[["overview","Overview"],["requests","Service Requests"],["orders","Orders"],["services","Services"],["products","Products"],["availability","Availability"],["earnings","Earnings"],["profile","Business Profile"]].map(([key,label])=><button className={tab===key?"active":""} key={key} onClick={()=>setTab(key)}>{label}</button>)}</nav>
    <button className="dash-logout" onClick={()=>nav("home")}>← Back to marketplace</button><button className="dash-logout account-delete-btn" onClick={deleteMyAccount}>Delete Account</button>
   </aside>
   <div className="dashboard-main">
    {tab==="overview"&&<EntrepreneurOverview requests={requests} orders={orders} products={products} setTab={setTab}/>} 
    {tab==="requests"&&<EntrepreneurRequests requests={requests} loading={requestLoading} acceptRequest={acceptRequest} rejectRequest={rejectRequest} completeRequest={completeRequest}/>}
    {tab==="orders"&&<EntrepreneurOrders orders={orders} updateOrder={updateOrder}/>}
    {tab==="services"&&<ManageServices services={services} loading={serviceLoading} setShowService={setShowService} showService={showService} notify={notify} addService={addService} deleteService={deleteService}/>}
    {tab==="products"&&<ManageProducts products={products} setShowProduct={setShowProduct} showProduct={showProduct} notify={notify} addProduct={addProduct} deleteProduct={deleteProduct}/>}
    {tab==="availability"&&<Availability available={available} setAvailable={setAvailable} notify={notify} toggleAvailability={toggleAvailability}/>}
    {tab==="earnings"&&<Earnings orders={orders}/>}
    {tab==="profile"&&<BusinessProfile profile={profile} form={profileForm} setForm={setProfileForm} saveProfile={saveProfile} loading={profileLoading}/>}
   </div>
  </div></section><Footer/>
 </main>
}

function EntrepreneurOverview({requests,orders,products,setTab}){
  const pending=requests.filter(r=>r.status==="pending").length;
  const processing=orders.filter(o=>["pending","processing","shipped"].includes(String(o.status||"").toLowerCase())).length;
  const [earnings,setEarnings]=useState(null);
  const [earningsLoading,setEarningsLoading]=useState(true);
  const [earningsError,setEarningsError]=useState("");

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      try{
        const token=localStorage.getItem("hh_token");
        const res=await fetch("http://localhost:5000/api/earnings/entrepreneur",{headers:{Authorization:`Bearer ${token}`}});
        const data=await res.json();
        if(!res.ok) throw new Error(data.message||"Could not load earnings");
        if(active) setEarnings(data.earnings||null);
      }catch(error){if(active)setEarningsError(error.message||"Could not load earnings");}
      finally{if(active)setEarningsLoading(false);}
    };
    load();
    return()=>{active=false};
  },[]);

  const money=value=>`₹${Number(value||0).toLocaleString("en-IN",{maximumFractionDigits:0})}`;
  const earningsText=earningsLoading?"Loading…":earningsError?"—":money(earnings?.totalEarnings);
  const earningsSub=earningsLoading?"Calculating completed orders…":earningsError?"Could not load earnings":`${earnings?.completedOrderCount||0} delivered order${earnings?.completedOrderCount===1?"":"s"}`;

  return <div>
    <div className="dash-title"><div><span className="section-kicker">Business overview</span><h2>Your storefront</h2></div><span className="online-pill"><span/> Open for business</span></div>
    <div className="stat-grid">
      <div><span>Total earnings</span><strong>{earningsText}</strong><small>{earningsSub}</small></div>
      <div><span>Service requests</span><strong>{pending}</strong><small>Need your response</small></div>
      <div><span>Active products</span><strong>{products.length}</strong><small>Products listed in marketplace</small></div>
      <div><span>Orders processing</span><strong>{processing}</strong><small>Product orders in progress</small></div>
    </div>
    <div className="dash-section-title"><h3>Requests needing attention</h3><button onClick={()=>setTab("requests")}>Manage <ArrowRight/></button></div>
    <div className="dashboard-list">{requests.filter(r=>r.status==="pending").slice(0,2).map(r=><RequestRow key={r._id} request={r} detailed/>)}</div>
    {requests.length===0&&<div className="empty-dashboard"><CalendarDays/><h3>No service requests yet</h3><p>Customer bookings will appear here when someone requests one of your services.</p></div>}
  </div>
}
function EntrepreneurRequests({requests,acceptRequest,rejectRequest,completeRequest,loading}){
 const fmt=r=>new Date(r.requestedDate).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
 return <div><div className="dash-title"><div><span className="section-kicker">Customer bookings</span><h2>Service Requests</h2></div></div>
 {loading?<div className="empty-dashboard"><CalendarDays/><h3>Loading requests…</h3><p>Fetching live bookings from MongoDB.</p></div>:
 requests.length===0?<div className="empty-dashboard"><CalendarDays/><h3>No service requests yet</h3><p>When customers book your services, their requests will appear here.</p></div>:
 <div className="seller-request-list">{requests.map(r=>{
   const status=r.status||"pending";
   return <article className="seller-request" key={r._id}><div className="request-service-icon"><CalendarDays/></div><div className="dash-order-info"><span>{fmt(r)} · HH-REQ-{String(r._id).slice(-6).toUpperCase()}</span><h3>{r.serviceId?.name||"Service request"}</h3><p>Customer: <strong>{r.customerId?.name||"Customer"}</strong> · {r.customerId?.email||""}</p>{r.message&&<small className="request-message">“{r.message}”</small>}</div><div className="seller-request-actions"><span className={`status ${status}`}>{status}</span>{status==="pending"&&<div><button className="accept-btn" onClick={()=>acceptRequest(r._id)}><CheckCircle2/> Accept</button><button className="reject-btn" onClick={()=>rejectRequest(r._id)}>Reject</button></div>}{status==="accepted"&&<button className="accept-btn" onClick={()=>completeRequest(r._id)}><CheckCircle2/> Complete</button>}</div></article>
 })}</div>}
 </div>
}
function EntrepreneurOrders({orders,updateOrder}){return <div><div className="dash-title"><div><span className="section-kicker">Product sales</span><h2>Orders</h2></div></div>{orders.length===0?<div className="empty-dashboard"><ShoppingBag/><h3>No orders yet</h3><p>Customer product orders will appear here.</p></div>:<div className="seller-order-list">{orders.map(o=>{const next=o.status==="pending"?"processing":o.status==="processing"?"shipped":o.status==="shipped"?"delivered":null;return <article className="seller-order-full" key={o.id||o._id}><div className="seller-order-icon"><ShoppingBag/></div><div className="dash-order-info"><span>{o.createdAt?new Date(o.createdAt).toLocaleDateString("en-IN"):"Recent"} · {o.orderId||o.id}</span><h3>{o.items?.[0]?.name||"Product order"}</h3><p>Customer: {o.customerId?.name||"Customer"} · Quantity: {o.items?.reduce((n,x)=>n+Number(x.quantity||0),0)||0}</p><strong>₹{Number(o.total||0).toLocaleString("en-IN")}</strong></div><div className="seller-order-actions"><span className={`status ${o.status}`}>{o.status}</span>{next&&<button onClick={()=>updateOrder(o.id,next)}>Mark {next}</button>}</div></article>})}</div>}</div>}
function ManageServices({services,setShowService,showService,notify,addService,deleteService,loading}){
 const [name,setName]=useState(""),[price,setPrice]=useState(""),[description,setDescription]=useState(""),[category,setCategory]=useState("");
 const save=()=>{if(!name.trim()||!price){notify("Enter service name and price.");return}addService({name,price,description,category});setName("");setPrice("");setDescription("");setCategory("")};
 return <div><div className="dash-title"><div><span className="section-kicker">Your offerings</span><h2>Services</h2></div><button className="btn btn-dark mini-btn" onClick={()=>setShowService(true)}>+ Add service</button></div>
 {loading?<div className="empty-dashboard"><Award/><h3>Loading your services…</h3><p>Fetching your live service catalogue.</p></div>:services.length===0?<div className="empty-dashboard"><Award/><h3>No services listed</h3><p>Add your first service. Approved entrepreneurs can then receive customer requests.</p></div>:<div className="manage-grid">{services.map(s=><article className="manage-card" key={s._id}><div className="manage-icon"><Award/></div><div><h3>{s.name}</h3><p>From ₹{s.price} · {s.category||"Local service"}</p><small>{s.description||"No description added."}</small></div><button onClick={()=>deleteService(s._id)}>Delete</button></article>)}</div>}
 {showService&&<div className="inline-form"><h3>Add service</h3><div><input value={name} onChange={e=>setName(e.target.value)} placeholder="Service name"/><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Starting price" type="number" min="0"/><input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Category (optional)"/></div><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe what the customer receives..." rows="3"/><button className="btn btn-dark mini-btn" onClick={save}>Save service</button><button className="cancel-link" onClick={()=>setShowService(false)}>Cancel</button></div>}</div>
}
function ManageProducts({products,setShowProduct,showProduct,notify,addProduct,deleteProduct}){
 const [name,setName]=useState(""),[price,setPrice]=useState(""),[stock,setStock]=useState("1"),[category,setCategory]=useState(""),[description,setDescription]=useState(""),[image,setImage]=useState("");
 const [saving,setSaving]=useState(false);
 const handleImage=async e=>{const file=e.target.files?.[0];if(!file)return;try{setImage(await imageFileToDataUrl(file));}catch(error){notify(error.message)}};
 const save=async()=>{
   if(!name.trim()||price===""||stock===""||!image){notify("Product name, image, price and stock are required.");return;}
   if(Number(stock)<0){notify("Stock cannot be negative.");return;}
   setSaving(true);
   try{await addProduct({name:name.trim(),description:description.trim(),price:Number(price),stock:Number(stock),category:category.trim(),image});setName("");setPrice("");setStock("1");setCategory("");setDescription("");setImage("");}finally{setSaving(false);}
 };
 return <div><div className="dash-title"><div><span className="section-kicker">Marketplace inventory</span><h2>Products</h2></div><button className="btn btn-dark mini-btn" onClick={()=>setShowProduct(true)}>+ Add product</button></div>
 {products.length===0&&!showProduct?<div className="empty-dashboard"><ShoppingBag/><h3>No products listed</h3><p>Add your first product with an image, price and stock. It will appear publicly after your entrepreneur profile is approved.</p></div>:products.length>0&&<div className="seller-product-grid">{products.map(p=><article className="seller-product-card" key={p.id||p._id}>{p.image?<img src={p.image} alt={p.name}/>:<div className="seller-product-placeholder"><ShoppingBag/></div>}<div><h3>{p.name}</h3><strong>₹{Number(p.price||0).toLocaleString("en-IN")}</strong><span>{p.stock} in stock</span><small>{p.category||"Local product"}</small></div><button onClick={()=>deleteProduct(p.id||p._id)}>Delete</button></article>)}</div>}
 {showProduct&&<div className="inline-form product-form"><h3>Add product</h3><div className="product-image-picker">{image?<img src={image} alt="Product preview"/>:<div><ShoppingBag/><span>Product image</span></div>}<label className="btn btn-outline upload-image-btn"><ShoppingBag/> {image?"Change image":"Upload image"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} hidden/></label></div><div><input value={name} onChange={e=>setName(e.target.value)} placeholder="Product name"/><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price" type="number" min="0"/><input value={stock} onChange={e=>setStock(e.target.value)} placeholder="Stock" type="number" min="0"/><input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Category"/></div><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the product..." rows="4"/><button className="btn btn-dark mini-btn" onClick={save} disabled={saving}>{saving?"Saving…":"Save product"} <ArrowRight/></button><button className="cancel-link" onClick={()=>setShowProduct(false)}>Cancel</button></div>}
 </div>
}
function Availability({available,setAvailable,notify,toggleAvailability}){
 const toggle=toggleAvailability||(()=>{setAvailable(!available);notify(!available?"You are now available.":"New requests paused.")});
 return <div><div className="dash-title"><div><span className="section-kicker">Storefront status</span><h2>Availability</h2></div></div><div className="availability-card"><div className={`availability-switch ${available?"on":""}`}><div><span className="switch-dot"/><div><h3>{available?"Currently accepting requests":"Currently unavailable"}</h3><p>{available?"Customers can request your services and place orders.":"Your profile remains visible, but new requests are paused."}</p></div></div><button onClick={toggle}>{available?"Pause requests":"Open for requests"}</button></div><div className="hours-grid"><div><Clock3/><strong>Working hours</strong><span>Mon – Sat · 9:00 AM – 7:00 PM</span></div><div><MapPin/><strong>Service area</strong><span>{`Business location will use your saved profile location.`}</span></div></div></div></div>
}
function Earnings(){
 const [data,setData]=useState(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   try{
    const token=localStorage.getItem("hh_token");
    const res=await fetch("http://localhost:5000/api/earnings/entrepreneur",{headers:{Authorization:`Bearer ${token}`}});
    const json=await res.json();
    if(!res.ok) throw new Error(json.message||"Could not load earnings");
    if(active) setData(json.earnings||null);
   }catch(e){if(active)setError(e.message||"Could not load earnings");}
   finally{if(active)setLoading(false);}
  };
  load();
  return()=>{active=false};
 },[]);
 const money=value=>`₹${Number(value||0).toLocaleString("en-IN",{maximumFractionDigits:0})}`;
 if(loading)return <div><div className="dash-title"><div><span className="section-kicker">Business performance</span><h2>Earnings</h2></div></div><div className="empty-dashboard"><IndianRupee/><h3>Loading earnings…</h3><p>Calculating your completed orders from MongoDB.</p></div></div>;
 if(error)return <div><div className="dash-title"><div><span className="section-kicker">Business performance</span><h2>Earnings</h2></div></div><div className="empty-dashboard"><IndianRupee/><h3>Could not load earnings</h3><p>{error}</p></div></div>;
 const monthly=data?.monthly||[];
 const max=Math.max(...monthly.map(x=>Number(x.total||0)),1);
 const growth=data?.growthPercent;
 return <div><div className="dash-title"><div><span className="section-kicker">Business performance</span><h2>Earnings</h2></div></div>
  <div className="earnings-hero"><div><span>Total earnings</span><strong>{money(data?.totalEarnings)}</strong><small>{data?.completedOrderCount||0} delivered order{data?.completedOrderCount===1?"":"s"}</small></div><div className="earnings-growth">{growth===null||growth===undefined?"—":`${growth>=0?"+":""}${growth.toFixed(1)}%`}<span>{growth===null||growth===undefined?"Need two months of delivered sales":"vs previous month"}</span></div></div>
  <div className="earnings-grid"><div><span>This month</span><strong>{money(data?.thisMonth)}</strong><small>{data?.thisMonthCount||0} delivered order{data?.thisMonthCount===1?"":"s"}</small></div><div><span>Pending order value</span><strong>{money(data?.pendingOrderValue)}</strong><small>{data?.pendingOrderCount||0} active order{data?.pendingOrderCount===1?"":"s"} not delivered yet</small></div><div><span>Average order value</span><strong>{money(data?.averageOrderValue)}</strong><small>Based on delivered product orders</small></div></div>
  <div className="earnings-chart"><h3>Monthly earnings</h3>{monthly.length===0?<div className="empty-dashboard"><IndianRupee/><h3>No earnings yet</h3><p>Delivered orders will appear here automatically.</p></div>:<div className="fake-bars">{monthly.map((item,i)=><div key={`${item.year}-${item.month}`}><span style={{height:`${Math.max(4,(Number(item.total||0)/max)*100)}%`}} title={money(item.total)}/><small>{item.label}</small></div>)}</div>}</div>
 </div>
}
function BusinessProfile({profile,form,setForm,saveProfile,loading}){
 const status=profile?.verificationStatus||"pending";
 const handleImageChange=async e=>{
   const file=e.target.files?.[0];
   if(!file)return;
   try{
     const image=await imageFileToDataUrl(file);
     setForm({...form,profileImage:image});
   }catch(error){alert(error.message);}
 };
 return <div><div className="dash-title"><div><span className="section-kicker">Public storefront</span><h2>Business Profile</h2></div><span className={`status ${status}`}>{status}</span></div>
  <div className="business-profile-card">
   <div className="business-cover"><div className="business-cover-image">{form.profileImage?<img src={form.profileImage} alt={form.businessName||"Business"}/>:<div className="cover-placeholder"><UserRound/><span>Add your profile photo</span></div>}</div></div>
   <div className="business-profile-body">
    <div className="business-profile-avatar">{form.profileImage?<img src={form.profileImage} alt="Profile"/>:(form.businessName||"E")[0]}</div>
    <div className="profile-image-upload">
      <div><strong>Profile image</strong><span>Use a clear photo of yourself or your business identity. JPG/PNG, max 2 MB.</span></div>
      <label className="btn btn-outline upload-image-btn"><UserRound/> {form.profileImage?"Change photo":"Upload photo"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} hidden/></label>
      {form.profileImage&&<button className="remove-image-btn" type="button" onClick={()=>setForm({...form,profileImage:""})}>Remove</button>}
    </div>
    <div className="profile-form-grid">
      <label><span>Business name *</span><input value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})} placeholder="Example: Your business name"/></label>
      <label><span>Skill / category *</span><input value={form.skill} onChange={e=>setForm({...form,skill:e.target.value})} placeholder="Tailor, Potter, Cobbler..."/></label>
      <label><span>Location *</span><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Hyderabad, Telangana"/></label>
      <label><span>Experience (years)</span><input type="number" min="0" value={form.experience} onChange={e=>setForm({...form,experience:e.target.value})} placeholder="5"/></label>
    </div>
    <label><span>About your business</span><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows="4" placeholder="Tell customers about your skills, experience and services."/></label>
    {status==="pending"&&profile?<p className="profile-verification-note"><ShieldCheck/> Your profile is waiting for admin verification. You can still update your details.</p>:null}
    {status==="rejected"&&profile?<p className="profile-verification-note rejected-note"><ShieldCheck/> Your application was rejected. Update your details and save again for review.</p>:null}
    <button className="btn btn-dark mini-btn" onClick={saveProfile} disabled={loading}>{profile?"Save profile":"Submit for verification"} <ArrowRight/></button>
   </div>
  </div>
 </div>
}
function CustomerDashboard({nav,notify,addToCart,deleteMyAccount}){
 const [tab,setTab]=useState("overview");
 const [profile,setProfile]=useState({name:"",phone:"",city:"",email:""}); const [saved,setSaved]=useState(false);
 const [requests,setRequests]=useState([]); const [requestLoading,setRequestLoading]=useState(true); const [services,setServices]=useState([]); const [serviceLoading,setServiceLoading]=useState(true); const [selectedService,setSelectedService]=useState(null); const [products,setProducts]=useState([]); const [productLoading,setProductLoading]=useState(true); const [selectedProduct,setSelectedProduct]=useState(null);
 const [orders,setOrders]=useState([]); const [orderLoading,setOrderLoading]=useState(true); const [selectedRequest,setSelectedRequest]=useState(null); const [reviewable,setReviewable]=useState([]); const [reviewLoading,setReviewLoading]=useState(true); const [reviewTarget,setReviewTarget]=useState(null); const [complaintTitle,setComplaintTitle]=useState(""); const [complaintType,setComplaintType]=useState("Marketplace complaint"); const [complaintDescription,setComplaintDescription]=useState(""); const [complaintBusy,setComplaintBusy]=useState(false); const [myComplaints,setMyComplaints]=useState([]); const [myComplaintsLoading,setMyComplaintsLoading]=useState(true);
 const authUser=JSON.parse(localStorage.getItem("hh_user")||"null"); const token=localStorage.getItem("hh_token");
 const loadOrders=async()=>{try{const res=await fetch("http://localhost:5000/api/orders/mine",{headers:{Authorization:`Bearer ${token}`}});const d=await res.json();if(!res.ok)throw new Error(d.message||"Could not load orders");setOrders(d.orders||[])}catch(e){notify(e.message)}finally{setOrderLoading(false)}};
 const loadMyComplaints=async()=>{try{const res=await fetch("http://localhost:5000/api/complaints/mine",{headers:{Authorization:`Bearer ${token}`}});const d=await res.json();if(!res.ok)throw new Error(d.message||"Could not load your complaints");setMyComplaints(d.complaints||[])}catch(e){notify(e.message)}finally{setMyComplaintsLoading(false)}};
 useEffect(()=>{setProfile({name:authUser?.name||"",email:authUser?.email||"",phone:authUser?.phone||"",city:authUser?.city||""});
   fetch("http://localhost:5000/api/service-requests/mine",{headers:{Authorization:`Bearer ${token}`}}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not load requests");setRequests(d.requests||[])}).catch(e=>notify(e.message)).finally(()=>setRequestLoading(false));
   fetch("http://localhost:5000/api/services").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not load services");setServices(d.services||[])}).catch(e=>notify(e.message)).finally(()=>setServiceLoading(false));
   fetch("http://localhost:5000/api/products").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not load products");setProducts((d.products||[]).map(normalizeProduct))}).catch(e=>notify(e.message)).finally(()=>setProductLoading(false));
   loadOrders();
   loadMyComplaints();
   fetch("http://localhost:5000/api/reviews/mine/eligible",{headers:{Authorization:`Bearer ${token}`}}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not load reviewable requests");setReviewable(d.requests||[])}).catch(e=>notify(e.message)).finally(()=>setReviewLoading(false));
 },[]);
 return <main><section className="dashboard-head"><div className="container dashboard-head-inner"><div><span className="section-kicker">Customer account</span><h1>Welcome back, {profile.name||"Customer"}.</h1><p>Track your service requests, orders and local marketplace activity.</p></div><div className="dash-avatar">{(profile.name||"C")[0]}</div></div></section>
 <section className="dashboard-section"><div className="container dashboard-layout"><aside className="dashboard-sidebar"><div className="dash-user"><div className="dash-avatar small">{(profile.name||"C")[0]}</div><div><strong>{profile.name||"Customer"}</strong><span>Customer</span></div></div><nav className="dash-nav">{[["overview","Overview"],["services","Find Services"],["products","Products"],["orders","My Orders"],["requests","Service Requests"],["saved","Saved Makers"],["profile","My Profile"],["complaints","Help & Complaints"]].map(([key,label])=><button className={tab===key?"active":""} key={key} onClick={()=>setTab(key)}>{label}{key==="requests"&&requests.length>0&&<b>{requests.filter(r=>r.status==="pending").length}</b>}</button>)}</nav><button className="dash-logout" onClick={()=>nav("home")}>← Back to marketplace</button><button className="dash-logout account-delete-btn" onClick={deleteMyAccount}>Delete Account</button></aside>
 <div className="dashboard-main">
 {tab==="overview"&&<Overview orders={orders} requests={requests} complaints={myComplaints} setTab={setTab}/>} 
 {tab==="services"&&<CustomerServices services={services} loading={serviceLoading} setSelectedService={setSelectedService}/>} {tab==="products"&&<CustomerProducts products={products} loading={productLoading} openProduct={setSelectedProduct}/>} 
 {tab==="orders"&&<OrdersTab orders={orders} loading={orderLoading}/>} 
 {tab==="requests"&&<RequestsTab requests={requests} loading={requestLoading} setSelectedRequest={setSelectedRequest}/>} 
 {tab==="saved"&&<SavedTab saved={saved} setSaved={setSaved} notify={notify}/>} 
 {tab==="reviews"&&<CustomerReviewsTab reviewable={reviewable} loading={reviewLoading} setReviewTarget={setReviewTarget}/>}
 {tab==="profile"&&<ProfileTab profile={profile} setProfile={setProfile} notify={notify}/>}
 {tab==="complaints"&&<CustomerComplaintTab complaints={myComplaints} complaintsLoading={myComplaintsLoading} refreshComplaints={loadMyComplaints} title={complaintTitle} setTitle={setComplaintTitle} type={complaintType} setType={setComplaintType} description={complaintDescription} setDescription={setComplaintDescription} busy={complaintBusy} onSubmit={async(e)=>{e.preventDefault();if(!complaintTitle.trim()||!complaintDescription.trim()){notify("Please enter a title and complaint description.");return;}setComplaintBusy(true);try{const res=await fetch("http://localhost:5000/api/complaints",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({title:complaintTitle.trim(),reason:complaintTitle.trim(),targetType:complaintType,description:complaintDescription.trim()})});const data=await res.json();if(!res.ok)throw new Error(data.message||"Could not submit complaint");setComplaintTitle("");setComplaintType("Marketplace complaint");setComplaintDescription("");await loadMyComplaints();notify("Complaint submitted successfully. Our team will review it.");}catch(error){notify(error.message||"Could not submit complaint.");}finally{setComplaintBusy(false);}}}/>} 
 </div></div></section><Footer/>{selectedService&&<ServiceRequestModal liveService={selectedService} onClose={()=>setSelectedService(null)} notify={notify}/>} {selectedProduct&&<div className="product-modal-backdrop" onClick={()=>setSelectedProduct(null)}><div className="product-modal" onClick={e=>e.stopPropagation()}><button className="back-btn" onClick={()=>setSelectedProduct(null)}><ArrowLeft/> Close</button><ProductDetails product={selectedProduct} notify={notify} addToCart={addToCart} back={()=>setSelectedProduct(null)} goToCart={()=>nav("cart")}/></div></div>} {selectedRequest&&<ServiceRequestDetails request={selectedRequest} onClose={()=>setSelectedRequest(null)}/>} {reviewTarget&&<ReviewModal request={reviewTarget} onClose={()=>setReviewTarget(null)} notify={notify} onSubmitted={()=>{setReviewTarget(null);fetch("http://localhost:5000/api/reviews/mine/eligible",{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(d=>setReviewable(d.requests||[])).catch(e=>notify(e.message));}}/>}</main>
}


function CustomerComplaintTab({title,setTitle,type,setType,description,setDescription,busy,onSubmit,complaints=[],complaintsLoading,refreshComplaints}){
 return <div><div className="dash-title"><div><span className="section-kicker">Help & support</span><h2>Submit a complaint</h2></div></div><div className="complaint-form-card"><p className="complaint-intro">Tell the HunarHub team what went wrong. Your complaint will be sent securely to the admin team for review.</p><form onSubmit={onSubmit} className="complaint-form"><label><span>Complaint type</span><select value={type} onChange={e=>setType(e.target.value)}><option>Marketplace complaint</option><option>Order or delivery issue</option><option>Service request issue</option><option>Entrepreneur or customer conduct</option><option>Payment issue</option><option>Other</option></select></label><label><span>Title</span><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} placeholder="Briefly describe the issue" required/></label><label><span>Description</span><textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={3000} rows={6} placeholder="Include the details needed to understand your complaint" required/></label><div className="complaint-form-footer"><small>Do not include passwords or other sensitive credentials.</small><button className="btn btn-dark" type="submit" disabled={busy}>{busy?"Submitting…":"Submit complaint"} <MessageCircle/></button></div></form></div><div className="dash-section-title complaint-history-heading"><h3>My recent complaints</h3><button type="button" onClick={refreshComplaints}>Refresh <ArrowRight/></button></div>{complaintsLoading?<div className="empty-dashboard"><MessageCircle/><h3>Loading complaints…</h3><p>Fetching your complaint history.</p></div>:complaints.length===0?<div className="empty-dashboard"><MessageCircle/><h3>No complaints submitted yet</h3><p>Complaints you submit will appear here with their current status.</p></div>:<div className="seller-request-list">{complaints.map(c=><article className="seller-request" key={c._id}><div className="request-service-icon"><MessageCircle/></div><div className="dash-order-info"><span>{c.createdAt?new Date(c.createdAt).toLocaleString("en-IN"):"Recently submitted"} · {c.targetType||"Marketplace complaint"}</span><h3>{c.title||c.reason||"Customer complaint"}</h3><p>{c.description}</p>{c.resolution&&<small className="request-message">Resolution: {c.resolution}</small>}</div><div className="seller-request-actions"><span className={`status ${String(c.status||"Open").toLowerCase()}`}>{c.status||"Open"}</span></div></article>)}</div>}</div>
}
function CustomerProducts({products,loading,openProduct}){
 return <div><div className="dash-title"><div><span className="section-kicker">Live marketplace</span><h2>Products</h2></div></div>{loading?<div className="empty-dashboard"><ShoppingBag/><h3>Loading products…</h3><p>Fetching live products from MongoDB.</p></div>:products.length===0?<div className="empty-dashboard"><ShoppingBag/><h3>No live products yet</h3><p>Verified entrepreneurs will appear here after they publish products.</p></div>:<div className="seller-product-grid">{products.map(p=><article className="seller-product-card" key={p.id||p._id} onClick={()=>openProduct(p)}>{p.image?<img src={p.image} alt={p.name}/>:<div className="seller-product-placeholder"><ShoppingBag/></div>}<div><h3>{p.name}</h3><strong>₹{p.price.toLocaleString("en-IN")}</strong><span>{p.stock>0?`${p.stock} in stock`:"Out of stock"}</span><small>{p.maker}</small></div></article>)}</div>}</div>
}

function CustomerServices({services,loading,setSelectedService}){return <div><div className="dash-title"><div><span className="section-kicker">Live marketplace</span><h2>Find Services</h2></div></div>{loading?<div className="empty-dashboard"><Award/><h3>Loading services…</h3><p>Fetching verified services from MongoDB.</p></div>:services.length===0?<div className="empty-dashboard"><Award/><h3>No live services yet</h3><p>Verified entrepreneurs will appear here after they publish services.</p></div>:<div className="customer-service-list">{services.map(s=><article className="customer-service-card" key={s._id}><div className="customer-service-icon"><Award/></div><div><span>{s.category||"Local service"}</span><h3>{s.name}</h3><p>{s.description||"Direct service from a verified local entrepreneur."}</p><small><MapPin/> {s.entrepreneurId?.location||"Local"}</small><strong>From ₹{s.price}</strong></div><button className="btn btn-dark mini-btn" onClick={()=>setSelectedService(s)}>Request service <ArrowRight/></button></article>)}</div>}</div>}
function Overview({orders,requests,complaints=[],setTab}){
 return <div>
  <div className="dash-title"><div><span className="section-kicker">Overview</span><h2>Your activity</h2></div></div>
  <div className="stat-grid"><div><span>Total orders</span><strong>{orders.length}</strong><small>Real orders will appear here.</small></div><div><span>Service requests</span><strong>{requests.length}</strong><small>Live requests from MongoDB.</small></div><div><span>Local makers supported</span><strong>0</strong><small>Based on completed activity.</small></div><div><span>Reviews given</span><strong>0</strong><small>Reviews will appear here.</small></div></div>
  <div className="dash-section-title"><h3>Recent orders</h3><button onClick={()=>setTab("orders")}>View all <ArrowRight/></button></div>
  <div className="dashboard-list">{orders.slice(0,2).map(o=><OrderRow key={o.id} order={o}/>)}</div>
  <div className="dash-section-title"><h3>Upcoming service requests</h3><button onClick={()=>setTab("requests")}>View all <ArrowRight/></button></div>
  <div className="dashboard-list">{requests.map(r=><RequestRow key={r.id} request={r}/>)}</div>
  <div className="dash-section-title"><h3>Recent complaints</h3><button onClick={()=>setTab("complaints")}>View all <ArrowRight/></button></div>
  {complaints.length===0?<div className="empty-dashboard compact-empty"><MessageCircle/><h3>No complaints yet</h3><p>Your submitted complaints and their status will appear here.</p><button className="btn btn-dark mini-btn" onClick={()=>setTab("complaints")}>Submit a complaint <ArrowRight/></button></div>:<div className="seller-request-list">{complaints.slice(0,3).map(c=><article className="seller-request" key={c._id}><div className="request-service-icon"><MessageCircle/></div><div className="dash-order-info"><span>{c.createdAt?new Date(c.createdAt).toLocaleDateString("en-IN"):"Recently submitted"} · {c.targetType||"Marketplace complaint"}</span><h3>{c.title||c.reason||"Customer complaint"}</h3><p>{c.description}</p>{c.resolution&&<small className="request-message">Resolution: {c.resolution}</small>}</div><div className="seller-request-actions"><span className={`status ${String(c.status||"Open").toLowerCase()}`}>{c.status||"Open"}</span></div></article>)}</div>}
 </div>
}
function OrdersTab({orders,loading}){return <div><div className="dash-title"><div><span className="section-kicker">Customer activity</span><h2>My Orders</h2></div></div>{loading?<div className="empty-dashboard"><ShoppingBag/><h3>Loading orders…</h3><p>Fetching your orders from MongoDB.</p></div>:orders.length===0?<div className="empty-dashboard"><ShoppingBag/><h3>No orders yet</h3><p>Your placed product orders will appear here.</p></div>:<div className="dashboard-list">{orders.map(o=><OrderRow key={o.id||o._id} order={o} detailed/>)}</div>}</div>}
function RequestsTab({requests,loading,setSelectedRequest}){
  return <div><div className="dash-title"><div><span className="section-kicker">Service bookings</span><h2>Service Requests</h2></div></div>{loading?<div className="empty-dashboard"><CalendarDays/><h3>Loading requests…</h3><p>Fetching your live requests from MongoDB.</p></div>:requests.length===0?<div className="empty-dashboard"><CalendarDays/><h3>No service requests yet</h3><p>Book a service from the Find Services tab.</p></div>:<div className="dashboard-list">{requests.map(r=><RequestRow key={r._id||r.id} request={r} detailed onView={()=>setSelectedRequest(r)}/>)}</div>}</div>}
function OrderRow({order,detailed}){const item=order.items?.[0];const name=item?.name||order.name||"Product order";const qty=order.items?.reduce((n,x)=>n+Number(x.quantity||0),0)||order.qty||0;const maker=order.entrepreneurId?.businessName||order.maker||"Local entrepreneur";const date=order.createdAt?new Date(order.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):(order.date||"Recent");const status=String(order.status||"pending");const label=status.charAt(0).toUpperCase()+status.slice(1);const image=item?.productId?.image||order.image||"";return <article className="dash-order"><div className="order-row-image">{image?<img src={image} alt={name}/>:<ShoppingBag/>}</div><div className="dash-order-info"><span>{date} · {order.orderId||order.id}</span><h3>{name}{order.items?.length>1?` + ${order.items.length-1} more`:""}</h3><p>{maker} · Quantity: {qty}</p><strong>₹{Number(order.total||0).toLocaleString("en-IN")}</strong></div><div className="dash-status-wrap"><span className={`status ${status}`}>{label}</span>{detailed&&<span className="order-detail-label">Order</span>}</div></article>}
function RequestRow({request,detailed,onView}){
  const real=Boolean(request._id);
  const date=real?new Date(request.requestedDate).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):`${request.date} · ${request.time}`;
  const service=real?(request.serviceId?.name||"Service request"):request.service;
  const maker=real?(request.entrepreneurId?.businessName||"Entrepreneur"):request.maker;
  const status=request.status||"pending";
  return <article className="dash-request"><div className="request-service-icon"><CalendarDays/></div><div className="dash-order-info"><span>{date} · {real?`HH-REQ-${String(request._id).slice(-6).toUpperCase()}`:request.id}</span><h3>{service}</h3><p>{maker}</p></div><div className="dash-status-wrap"><span className={`status ${String(status).toLowerCase()}`}>{status}</span>{detailed&&<button type="button" onClick={onView}>View request <ArrowRight/></button>}</div></article>
}
function ServiceRequestDetails({request,onClose}){
  if(!request)return null;
  const service=request.serviceId?.name||request.serviceName||"Service request";
  const maker=request.entrepreneurId?.businessName||request.entrepreneurName||"Entrepreneur";
  const location=request.entrepreneurId?.location||"Local";
  const status=request.status||"pending";
  const requestId=request._id?`HH-REQ-${String(request._id).slice(-6).toUpperCase()}`:(request.id||"Request");
  const requestedDate=request.requestedDate?new Date(request.requestedDate).toLocaleString("en-IN",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}):`${request.date||"Date not specified"}${request.time?` · ${request.time}`:""}`;
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="request-modal"><div className="modal-head"><div><span className="section-kicker">Service request</span><h2>{service}</h2><p>{maker} · {location}</p></div><button className="modal-close" type="button" onClick={onClose}><X/></button></div><div className="request-summary"><div className="request-avatar">{maker[0]||"E"}</div><div><strong>{maker}</strong><span><ShieldCheck/> Verified local entrepreneur</span></div><span className={`status ${String(status).toLowerCase()}`}>{status}</span></div><div className="form-grid"><div><span>Requested date & time</span><strong>{requestedDate}</strong></div><div><span>Request ID</span><strong>{requestId}</strong></div></div><label className="message-field"><span>Your request message</span><div className="request-detail-message">{request.message||"No additional message was provided."}</div></label><div className="request-note"><ShieldCheck/> Track the request status here. The entrepreneur can accept, reject or complete the service.</div><div className="modal-actions"><button className="btn btn-dark" type="button" onClick={onClose}>Done</button></div></div></div>
}
function SavedTab({saved,setSaved,notify}){return <div><div className="dash-title"><div><span className="section-kicker">Your community</span><h2>Saved Makers</h2></div></div><div className="empty-dashboard"><Heart/><h3>No saved makers yet</h3><p>Saved makers will appear here once the save feature is connected.</p></div></div>}
function ProfileTab({profile,setProfile,notify}){return <div><div className="dash-title"><div><span className="section-kicker">Account settings</span><h2>My Profile</h2></div></div><div className="profile-form-card"><div className="profile-form-avatar">P</div><div className="profile-form-grid"><label><span>Full name</span><input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label><label><span>Email</span><input value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})}/></label><label><span>Phone</span><input value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})}/></label><label><span>City</span><input value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></label></div><button className="btn btn-dark" onClick={()=>notify("Profile editing is not connected yet.")}>Save changes</button></div></div>}

function ReviewModal({request,onClose,notify,onSubmitted}){
 const [rating,setRating]=useState(0),[hover,setHover]=useState(0),[comment,setComment]=useState(""),[loading,setLoading]=useState(false);
 const submit=async()=>{if(!rating){notify("Choose a rating from 1 to 5 stars.");return}setLoading(true);try{const token=localStorage.getItem("hh_token");const res=await fetch("http://localhost:5000/api/reviews",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({requestId:request._id,rating,comment})});const d=await res.json();if(!res.ok)throw new Error(d.message||"Could not submit review");notify("Review submitted successfully.");onSubmitted?.()}catch(e){notify(e.message)}finally{setLoading(false)}};
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="request-modal"><div className="modal-head"><div><span className="section-kicker">Customer feedback</span><h2>Rate {request.serviceName||"this service"}</h2><p>{request.entrepreneurName||"Entrepreneur"}</p></div><button className="modal-close" onClick={onClose}><X/></button></div><div style={{textAlign:"center",padding:"18px 0"}}><div style={{display:"flex",justifyContent:"center",gap:"6px"}}>{[1,2,3,4,5].map(n=><button key={n} type="button" onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(0)} onClick={()=>setRating(n)} style={{background:"none",border:0,cursor:"pointer",fontSize:"34px",color:(hover||rating)>=n?"#b88900":"#cfd6cf"}}>★</button>)}</div><strong>{rating?`${rating} out of 5`:"Choose your rating"}</strong></div><label className="message-field"><span>Your review (optional)</span><textarea value={comment} maxLength="1000" onChange={e=>setComment(e.target.value)} placeholder="Tell others what the service was like…" rows="5"/></label><div className="modal-actions"><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-dark" onClick={submit} disabled={loading}>{loading?"Submitting…":"Submit review"} {!loading&&<ArrowRight/>}</button></div></div></div>
}
function CustomerReviewsTab({reviewable,loading,setReviewTarget}){return <div><div className="dash-title"><div><span className="section-kicker">Your feedback</span><h2>Reviews</h2></div></div>{loading?<div className="empty-dashboard"><Star/><h3>Loading reviewable services…</h3><p>Checking your completed service requests.</p></div>:reviewable.length===0?<div className="empty-dashboard"><Star/><h3>No reviews waiting</h3><p>Complete a service to leave feedback for the entrepreneur.</p></div>:<div className="dashboard-list">{reviewable.map(r=><article className="dash-request" key={r._id}><div className="request-service-icon"><Star/></div><div className="dash-order-info"><span>Completed service</span><h3>{r.serviceName||"Service"}</h3><p>{r.entrepreneurName||"Entrepreneur"}</p></div><div className="dash-status-wrap"><button className="btn btn-dark mini-btn" onClick={()=>setReviewTarget(r)}>Rate service <Star/></button></div></article>)}</div>}</div>}

function ProductDetails({product={},notify,addToCart,back,goToCart}){
 const maxStock=Math.max(0,Number(product.stock||0));
 const [qty,setQty]=useState(maxStock>0?1:0);
 return <main>
  <section className="product-detail-section"><div className="container">
   <button className="back-btn" onClick={back}><ArrowLeft/> Back to marketplace</button>
   <div className="product-detail-grid">
    <div className="product-detail-image">{product.image?<img src={product.image} alt={product.name}/>:<div className="product-detail-placeholder"><ShoppingBag/></div>}<span>{product.category}</span></div>
    <div className="product-detail-copy">
     <span className="section-kicker">Verified local product</span><h1>{product.name}</h1><p className="maker-link"><MapPin/> Made by <strong>{product.maker}</strong> · Local entrepreneur</p>
     <div className="detail-rating"><span>{product.stock>0?"In stock":"Out of stock"}</span><span>{product.category}</span></div>
     <p className="detail-description">{product.description||"A locally made product published by a verified HunarHub entrepreneur."}</p>
     <div className="price-block"><span>Price</span><strong>₹{Number(product.price||0).toLocaleString("en-IN")}</strong><small>{product.stock>0?`${product.stock} available`:"Currently unavailable"}</small></div>
     <div className="detail-quantity"><span>Quantity</span><div><button onClick={()=>setQty(Math.max(1,qty-1))} disabled={qty<=1}>−</button><b>{qty}</b><button onClick={()=>setQty(Math.min(maxStock,qty+1))} disabled={qty>=maxStock}>+</button></div></div>
     <div className="detail-actions"><button className="btn btn-dark" disabled={product.stock<=0} onClick={()=>{for(let i=0;i<Math.min(qty,maxStock);i++)addToCart(product)}}><ShoppingBag/> {product.stock>0?"Add to cart":"Out of stock"}</button><button className="btn btn-outline" disabled={product.stock<=0} onClick={()=>{if(maxStock>0){for(let i=0;i<Math.min(qty,maxStock);i++)addToCart(product);if(goToCart)goToCart();else notify("Product added to cart.");}}}>Buy now <ArrowRight/></button></div>
     <div className="detail-trust"><span><ShieldCheck/> Verified local seller</span><span><HandHeart/> Supports local talent</span><span><Clock3/> Made to order may take longer</span></div>
    </div>
   </div>
  </div></section><Footer/>
 </main>
}

function CartPage({cart,updateQty,nav}){
 const subtotal=cart.reduce((s,x)=>s+(parseInt(String(x.price).replace(/[^0-9]/g,""))||0)*x.qty,0);
 return <main><section className="cart-section"><div className="container">
   <div className="cart-title"><div><span className="section-kicker">Your marketplace bag</span><h1>Shopping cart</h1></div><span>{cart.reduce((s,x)=>s+x.qty,0)} item(s)</span></div>
   {cart.length===0?<div className="empty-cart"><ShoppingBag/><h2>Your cart is empty.</h2><p>Discover handmade products from local entrepreneurs.</p><button className="btn btn-dark" onClick={()=>nav("home")}>Explore products <ArrowRight/></button></div>:
   <div className="cart-layout"><div className="cart-items">
    {cart.map(item=><article className="cart-item" key={item.name}><img src={item.image} alt={item.name}/><div className="cart-item-info"><span>{item.category}</span><h3>{item.name}</h3><p>{item.maker}</p><strong>₹{parseInt(String(item.price).replace(/[^0-9]/g,""))}</strong></div><div className="qty-control"><button onClick={()=>updateQty(item.id||item._id||item.name,item.qty-1)}>−</button><b>{item.qty}</b><button onClick={()=>updateQty(item.id||item._id||item.name,item.qty+1)}>+</button></div></article>)}
   </div><aside className="summary-card"><span className="section-kicker">Order summary</span><h2>Ready to order?</h2><div><span>Subtotal</span><strong>₹{subtotal.toLocaleString("en-IN")}</strong></div><div><span>Delivery</span><strong>Local seller</strong></div><div className="summary-total"><span>Total</span><strong>₹{subtotal.toLocaleString("en-IN")}</strong></div><button className="btn btn-dark full" onClick={()=>nav("checkout")}>Continue to checkout <ArrowRight/></button><p><ShieldCheck/> Your order details are protected.</p></aside></div>}
  </div></section><Footer/></main>
}

function CheckoutPage({cart,nav,clearCart,notify}){
 const [placed,setPlaced]=useState(false),[placing,setPlacing]=useState(false),[orderIds,setOrderIds]=useState([]);const [form,setForm]=useState({name:"",phone:"",address:"",city:"",pincode:""});const subtotal=cart.reduce((s,x)=>s+(Number(x.price)||0)*x.qty,0);
 const submit=async e=>{e.preventDefault();if(!form.name||!form.phone||!form.address||!form.city||!form.pincode){notify("Please complete all delivery details.");return}if(!cart.length){notify("Your cart is empty.");nav("cart");return}setPlacing(true);try{const token=localStorage.getItem("hh_token");const res=await fetch("http://localhost:5000/api/orders",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({items:cart.map(x=>({productId:x.id||x._id,quantity:x.qty})),delivery:form})});const data=await res.json();if(!res.ok)throw new Error(data.message||"Could not place order");setOrderIds((data.orders||[]).map(o=>o.orderId||o.id));setPlaced(true);clearCart();notify("Order placed successfully.")}catch(error){notify(error.message||"Could not place order.")}finally{setPlacing(false)}};
 if(placed)return <main><section className="order-success-section"><div className="success-order"><div className="success-icon"><CheckCircle2/></div><span className="section-kicker">Order confirmed</span><h1>Thanks for supporting local.</h1><p>Your order has been saved to MongoDB. The entrepreneur can now process it and update its status.</p><div className="order-number">Order ID <strong>{orderIds.length?orderIds.join(" · "):"Confirmed"}</strong></div><div style={{display:"flex",gap:"10px",justifyContent:"center",flexWrap:"wrap"}}><button className="btn btn-dark" onClick={()=>nav("customer")}>View my orders <ArrowRight/></button><button className="btn btn-outline" onClick={()=>nav("home")}>Continue shopping</button></div></div></section><Footer/></main>;
 return <main><section className="checkout-section"><div className="container"><button className="back-btn" onClick={()=>nav("cart")}><ArrowLeft/> Back to cart</button><div className="checkout-layout"><form className="checkout-form" onSubmit={submit}><span className="section-kicker">Secure checkout</span><h1>Delivery details</h1><p>Payment is kept out of scope for this MVP. Placing this form creates the real product order in MongoDB.</p><div className="checkout-grid">{[["name","Full name"],["phone","Phone number"],["city","City"],["pincode","Pincode"]].map(([k,l])=><label key={k}><span>{l}</span><input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={l}/></label>)}</div><label><span>Delivery address</span><textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})} rows="4" placeholder="House / flat, street, area"/></label><div className="payment-note"><span><ShieldCheck/></span><div><strong>Payment method</strong><p>Payment integration can be added later. Your order and delivery details are recorded now.</p></div></div><button className="btn btn-dark full" type="submit" disabled={placing}>{placing?"Placing order…":"Place order"} {!placing&&<ArrowRight/>}</button></form><aside className="checkout-summary"><span className="section-kicker">Your order</span><h2>{cart.length} product{cart.length!==1?"s":""}</h2>{cart.map(x=><div className="mini-order" key={x.id||x._id||x.name}><img src={x.image} alt={x.name}/><div><strong>{x.name}</strong><span>{x.qty} × ₹{Number(x.price).toLocaleString("en-IN")}</span></div></div>)}<div className="summary-total"><span>Total</span><strong>₹{subtotal.toLocaleString("en-IN")}</strong></div></aside></div></div></section><Footer/></main>
}

function Step({n,title,text}){
  return (
    <div className="step">
      <span>{n}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

function Footer(){
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <button className="brand brand-button footer-brand">
            <span className="brand-mark">H</span>
            <span>Hunar<span>Hub</span></span>
          </button>
          <p>Connecting local skills with the people who value them.</p>
        </div>

        <div>
          <h4>Discover</h4>
          <a href="#explore">Entrepreneurs</a>
          <a href="#products">Products</a>
          <a href="#services">Services</a>
        </div>

        <div>
          <h4>Platform</h4>
          <a href="#how">How it works</a>
          <a href="#home">For makers</a>
          <a href="#home">For customers</a>
        </div>

        <div>
          <h4>Built for local</h4>
          <p className="footer-note">
            A project focused on digital inclusion, traditional skills and community-based commerce.
          </p>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© 2026 HunarHub</span>
        <span>Digital marketplace for local micro-entrepreneurs</span>
      </div>
    </footer>
  );
}

createRoot(document.getElementById("root")).render(<App />);