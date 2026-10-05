const KEY="haru-record-v1";
const categories={income:["급여","용돈","기타수입","이체"],expense:["식비","교통비","쇼핑","술/외식","생활","통신","주거","기타"]};
let state=load();
let currentMonth=new Date();
let selectedDate=null;
let selectedMood="😐";

const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,"0");
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const won=n=>`${Number(n||0).toLocaleString("ko-KR")}원`;
const monthKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function load(){try{return JSON.parse(localStorage.getItem(KEY))||{days:{}}}catch{return {days:{}}}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function dayData(key){return state.days[key] ||= {income:[],expense:[],diary:"",mood:"😐"}}

function render(){
  $("monthTitle").textContent=`${currentMonth.getFullYear()}년 ${currentMonth.getMonth()+1}월`;
  renderSummary(); renderCalendar();
}
function renderSummary(){
  const mk=monthKey(currentMonth); let inc=0,exp=0;
  Object.entries(state.days).forEach(([k,v])=>{
    if(k.startsWith(mk)){inc+=v.income.reduce((a,x)=>a+Number(x.amount),0);exp+=v.expense.reduce((a,x)=>a+Number(x.amount),0)}
  });
  $("monthIncome").textContent=won(inc);$("monthExpense").textContent=won(exp);$("monthBalance").textContent=won(inc-exp);
}
function renderCalendar(){
  const grid=$("calendarGrid");grid.innerHTML="";
  const y=currentMonth.getFullYear(),m=currentMonth.getMonth();
  const first=new Date(y,m,1), last=new Date(y,m+1,0);
  for(let i=0;i<first.getDay();i++) grid.appendChild(document.createElement("div"));
  for(let d=1;d<=last.getDate();d++){
    const date=new Date(y,m,d),key=dateKey(date),v=state.days[key];
    const b=document.createElement("button");b.className="day";
    if(dateKey(new Date())===key)b.classList.add("today");
    const hasInc=v?.income?.length,hasExp=v?.expense?.length,hasDiary=!!v?.diary?.trim();
    b.innerHTML=`<span class="day-num">${d}</span><span class="marks">${hasInc?'<i class="dot green"></i>':''}${hasExp?'<i class="dot red"></i>':''}${hasDiary?'<i class="dot blue"></i>':''}</span>`;
    b.onclick=()=>openDay(date);grid.appendChild(b);
  }
}
function openDay(date){
  selectedDate=date; const key=dateKey(date),v=dayData(key);
  $("dayTitle").textContent=`${date.getFullYear()}년 ${date.getMonth()+1}월 ${date.getDate()}일`;
  $("diaryText").value=v.diary||"";selectedMood=v.mood||"😐";updateMood();
  renderDayMoney();showSheet();showTab("money");
}
function renderDayMoney(){
  const v=dayData(dateKey(selectedDate));
  const inc=v.income.reduce((a,x)=>a+Number(x.amount),0),exp=v.expense.reduce((a,x)=>a+Number(x.amount),0);
  $("dayIncome").textContent=won(inc);$("dayExpense").textContent=won(exp);$("dayBalance").textContent=`잔액 ${won(inc-exp)}`;
  const list=[...v.income.map(x=>({...x,type:"income"})),...v.expense.map(x=>({...x,type:"expense"}))];
  $("transactionList").innerHTML=list.length?list.map((x,i)=>`<div class="transaction ${x.type}"><div class="symbol">${x.type==="income"?"＋":"−"}</div><div class="info"><div class="cat">${escapeHtml(x.category)}</div>${x.memo?`<div class="memo">${escapeHtml(x.memo)}</div>`:""}</div><div class="amount">${x.type==="income"?"+":"-"}${won(x.amount)}</div></div>`).join(""):`<div class="transaction"><div class="info"><div class="cat">아직 기록이 없습니다.</div></div></div>`;
}
function showSheet(){ $("sheetBackdrop").classList.remove("hidden");$("daySheet").classList.remove("hidden");document.body.style.overflow="hidden" }
function closeSheet(){ $("sheetBackdrop").classList.add("hidden");$("daySheet").classList.add("hidden");document.body.style.overflow="" }
function showTab(tab){
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab));
  $("moneyTab").classList.toggle("hidden",tab!=="money");$("diaryTab").classList.toggle("hidden",tab!=="diary");
}
function updateMood(){document.querySelectorAll("#moodButtons button").forEach(b=>b.classList.toggle("active",b.dataset.mood===selectedMood))}
function updateCategories(){
  const type=$("transactionType").value; $("transactionCategory").innerHTML=categories[type].map(x=>`<option>${x}</option>`).join("");
  $("transactionTitle").textContent=type==="income"?"수입 추가":"지출 추가";
}
function toast(msg){$("toast").textContent=msg;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),1600)}

$("prevMonth").onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()-1);render()};
$("nextMonth").onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()+1);render()};
$("todayBtn").onclick=()=>{currentMonth=new Date();render();openDay(new Date())};
$("openToday").onclick=()=>openDay(new Date());
$("closeSheet").onclick=closeSheet;
$("sheetBackdrop").onclick=closeSheet;
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
document.querySelectorAll("#moodButtons button").forEach(b=>b.onclick=()=>{selectedMood=b.dataset.mood;updateMood()});

$("addTransaction").onclick=()=>{
  $("transactionType").value="expense";updateCategories();
  $("transactionAmount").value="";$("transactionMemo").value="";
  $("transactionModal").classList.remove("hidden");
};
$("transactionType").onchange=updateCategories;
$("cancelTransaction").onclick=()=>$("transactionModal").classList.add("hidden");
$("saveTransaction").onclick=()=>{
  const amount=Number($("transactionAmount").value); if(!amount||amount<1){toast("금액을 입력해주세요.");return}
  const type=$("transactionType").value,v=dayData(dateKey(selectedDate));
  v[type].push({amount,category:$("transactionCategory").value,memo:$("transactionMemo").value,created:Date.now()});
  save();$("transactionModal").classList.add("hidden");render();renderDayMoney();toast("저장했습니다.");
};
$("saveDiary").onclick=()=>{
  const v=dayData(dateKey(selectedDate));v.diary=$("diaryText").value;v.mood=selectedMood;save();render();toast("일기를 저장했습니다.");
};

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
render();
