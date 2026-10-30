(() => {
  'use strict';
  const p = window.PROJECT;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number = (value, digits = 0) => new Intl.NumberFormat('ru-RU',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
  const million = value => number(value / 1e6,2);
  const safeURL = value => {try {const u=new URL(value);return ['https:','http:'].includes(u.protocol)?esc(u.href):'#';}catch{return '#';}};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const longMonths = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  $$('[data-source]').forEach(link => link.href=p.sourceUrl);
  $$('[data-strategy]').forEach(link => link.href=`${p.sourceUrl}#gid=${p.strategyGid}`);
  $$('[data-budget-source]').forEach(link=>link.href=`${p.sourceUrl}#gid=${p.budget2027.gid}`);

  // Each image is a local, attributed city photograph, not an office rendering.
  $('#city-monoliths').innerHTML=p.cities.map(c=>`<figure class="monolith"><a href="#cities" data-city="${c.id}" aria-label="Посмотреть ${esc(c.name)}"><img src="${c.image}" alt="" width="360" height="520"></a><figcaption>${esc(c.name)}</figcaption></figure>`).join('');
  let selectedCity=p.cities[0].id;
  $('#city-tabs').innerHTML=p.cities.map((c,i)=>`<button id="city-tab-${c.id}" role="tab" aria-selected="${i===0}" aria-controls="city-theatre" tabindex="${i===0?0:-1}" data-city-tab="${c.id}">${esc(c.name)}</button>`).join('');
  $('#economy-city-selector').innerHTML=p.cities.map((c,i)=>`<button data-economy-city="${c.id}" aria-pressed="${i===0}">${esc(c.name)}</button>`).join('');
  const budget=p.budget2027;
  const expenseMoney=value=>value==null?'Не заполнено':`${number(value)} ₽`;
  $('#budget-city-select').innerHTML=budget.cities.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#budget-overview').innerHTML=`<div class="finance-cell"><span>Сумма заполненных итогов · ${budget.citiesWithTotals} города</span><strong>${million(budget.reportedTotal)} <small>млн ₽ / год</small></strong></div><div class="finance-cell"><span>Первый месяц · по ${budget.citiesWithTotals} заполненным итогам</span><strong>${million(budget.reportedMonths[0])} <small>млн ₽</small></strong></div>`;
  $('#budget-city-totals').innerHTML=`<table><thead><tr>${['Город','Январь, ₽','Следующий месяц, ₽','Итог за 2027, ₽'].map(v=>`<th scope="col">${v}</th>`).join('')}</tr></thead><tbody>${budget.cities.map(c=>`<tr><th scope="row">${esc(c.name)}</th><td>${expenseMoney(c.months[0])}</td><td>${expenseMoney(c.monthly)}</td><td>${expenseMoney(c.annual)}</td></tr>`).join('')}</tbody></table>`;
  function renderBudget(id){
    const c=budget.cities.find(c=>c.id===id);
    $('#budget-city-select').value=id;
    $('#budget-line-items').innerHTML=`<table><caption class="budget-caption">${esc(c.name)} · ${esc(c.sourceRows)}</caption><thead><tr>${['Статья','Разово, ₽','Ежемесячно, ₽','Январь, ₽','За 2027, ₽'].map(v=>`<th scope="col">${v}</th>`).join('')}</tr></thead><tbody>${c.items.map(item=>`<tr><th scope="row">${esc(item.label)}</th><td>${expenseMoney(item.launch)}</td><td>${expenseMoney(item.monthly)}</td><td>${expenseMoney(item.months[0])}</td><td>${expenseMoney(item.annual)}</td></tr>`).join('')}</tbody></table>${c.completeTotal?'':`<p class="dialog-note">По внесённым статьям Ростова: ${number(c.knownLineAnnual)} ₽ за год, без незаполненной аренды. Это частичный расчёт; общий итог города в таблице отсутствует.</p>`}`;
    $('#budget-preview-city').textContent=`Смета 2027 · ${c.name}`;
    $('#budget-preview-value').textContent=c.annual==null?'Итог не заполнен':`${million(c.annual)} млн ₽ / год`;
  }
  $('#budget-city-select').addEventListener('change',event=>showCity(event.target.value));
  function showCity(id) {
    const i=p.cities.findIndex(c=>c.id===id);
    if(i<0)return;
    selectedCity=id;
    const c=p.cities[i];
    const credit=p.photoCredits.find(credit=>credit.city===c.name);
    $$('[data-city-tab]').forEach(button=>{const active=button.dataset.cityTab===id;button.setAttribute('aria-selected',active);button.tabIndex=active?0:-1;});
    $$('[data-economy-city]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.economyCity===id));
    $('#city-theatre').setAttribute('aria-labelledby',`city-tab-${id}`);
    $('#city-theatre').innerHTML=`<img class="city-image city-${id}" src="${c.image}" alt="${esc(c.name)} — вид города" width="1800" height="1200"><div class="city-shade" aria-hidden="true"></div><div class="city-slide-copy"><div class="city-slide-top"><span>${esc(c.region.toUpperCase())} · НАПРАВЛЕНИЕ 0${i+1}</span><h3>${esc(c.name)}</h3></div><div class="city-slide-bottom"><p>${esc(c.intro)}</p><div class="city-plan-metric"><span>ПЛАН КОМАНДЫ<br>К ДЕКАБРЮ 2027</span><b>${number(c.agents[11])}</b><small>агентов</small></div></div></div><a class="city-photo-credit" href="${safeURL(credit.source)}" target="_blank" rel="noopener">Фото: ${esc(credit.author)} · ${esc(credit.license)}</a>`;
    $('#city-reason').textContent=`Перед открытием: ${c.verify.replace(/\.$/,'')}.`;
    $('#city-counter').textContent=`0${i+1} / 05`;
    $('#economy-city-name').textContent=c.name.toUpperCase();
    $('#average-value').innerHTML=`${number(c.average)}<span>₽</span>`;
    $('#secondary-value').textContent=`${number(c.secondary)} ₽`;
    $('#primary-value').textContent=`${number(c.primary)} ₽`;
    $('#secondary-bar').style.width=`${c.secondary / 300000 * 100}%`;
    $('#primary-bar').style.width=`${c.primary / 300000 * 100}%`;
    $('#annual-finance').innerHTML=[['ВВ за 2027 · план',c.annualRevenue],['Агентам · 50%',c.agentPayment],['РОПу · 10%',c.ropPayment],['Остаток до расходов · 40%',c.beforeExpenses]].map(([title,value])=>`<div><span>${title}</span><strong>${million(value)} <small>млн ₽</small></strong></div>`).join('');
    renderBudget(id);
  }
  document.addEventListener('click',event=>{const link=event.target.closest('[data-city]');if(link)showCity(link.dataset.city);});
  $('#city-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-city-tab]');if(button)showCity(button.dataset.cityTab);});
  $('#economy-city-selector').addEventListener('click',event=>{const button=event.target.closest('[data-economy-city]');if(button)showCity(button.dataset.economyCity);});
  function moveCity(delta){const i=p.cities.findIndex(c=>c.id===selectedCity);showCity(p.cities[(i+delta+p.cities.length)%p.cities.length].id);}
  $('#previous-city').addEventListener('click',()=>moveCity(-1));
  $('#next-city').addEventListener('click',()=>moveCity(1));
  $('#city-tabs').addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='Home')showCity(p.cities[0].id);else if(event.key==='End')showCity(p.cities.at(-1).id);else moveCity(event.key==='ArrowRight'?1:-1);
    const tab=$(`#city-tab-${selectedCity}`);tab.focus({preventScroll:true});tab.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduced.matches?'instant':'smooth'});
  });

  let month=0;
  let teamScope='office';
  const width=1020,height=205,left=25,right=25,top=18,bottom=27;
  function renderTeam(){
    const values=teamScope==='office'?p.cities[0].agents:p.totalAgents;
    const max=values[11];
    const x=i=>left+i/11*(width-left-right);
    const y=value=>height-bottom-value/max*(height-top-bottom);
    const path=values.map((value,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(value).toFixed(2)}`).join(' ');
    const activePath=values.slice(0,month+1).map((value,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(value).toFixed(2)}`).join(' ');
    $('#team-value').textContent=number(values[month]);
    const count=values[month];
    const agentWord=count%100>=11&&count%100<=14?'агентов':count%10===1?'агент':count%10>=2&&count%10<=4?'агента':'агентов';
    $('#team-unit').textContent=`${agentWord} ${teamScope==='office'?'на офис':'в пяти городах'}`;
    $('#month-output').textContent=`${longMonths[month]} 2027`;
    $('#team-month').setAttribute('aria-valuetext',`${longMonths[month]} 2027: ${number(values[month])} ${teamScope==='office'?'агентов на офис':'агентов в сети'}`);
    $$('[data-team-scope]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.teamScope===teamScope));
    $('#team-chart').innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="team-svg-title team-svg-desc"><title id="team-svg-title">План роста команды — ${teamScope==='office'?'один офис':'пять офисов'}</title><desc id="team-svg-desc">От ${number(values[0])} в январе до ${number(values[11])} агентов в декабре 2027. Выбран ${longMonths[month].toLowerCase()}: ${number(values[month])}.</desc><defs><linearGradient id="team-area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#4e6fdc" stop-opacity=".1"/><stop offset="1" stop-color="#4e6fdc" stop-opacity="0"/></linearGradient></defs>${[.25,.5,.75,1].map(v=>`<line x1="${left}" x2="${width-right}" y1="${y(max*v)}" y2="${y(max*v)}" stroke="#f0f0f5"/>`).join('')}<path d="${path} L${x(11)},${height-bottom} L${x(0)},${height-bottom}Z" fill="url(#team-area)"/><path d="${path}" fill="none" stroke="#e3e7f5" stroke-width="3"/><path d="${activePath}" fill="none" stroke="#4b6cda" stroke-width="3"/><line x1="${x(month)}" x2="${x(month)}" y1="${y(values[month])}" y2="${height-bottom}" stroke="#cdd6f1" stroke-dasharray="3 5"/>${values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="${i===month?5:2.5}" fill="${i<=month?'#4b6cda':'#d2d8ed'}"/>`).join('')}${[0,2,5,8,11].map(i=>`<text x="${x(i)}" y="${height-4}" text-anchor="middle">${p.months[i]}</text>`).join('')}</svg>`;
  }
  $('#team-month').addEventListener('input',event=>{month=Number(event.target.value);renderTeam();});
  $$('[data-team-scope]').forEach(button=>button.addEventListener('click',()=>{teamScope=button.dataset.teamScope;renderTeam();}));
  const productivity=p.cities[0].productivity;
  $('#deal-plan-summary').innerHTML=`<div><strong>${number(p.cities[0].annualDeals,1)}</strong><span>расчётных сделок за год / офис</span></div><div><strong>${number(p.annual.deals,1)}</strong><span>расчётных сделок за год / сеть</span></div>`;
  $('#network-revenue-summary').innerHTML=`Пять городов: <b>${million(p.annual.revenue)} млн ₽</b> плановой ВВ за 2027.<br><span>${million(p.annual.beforeExpenses)} млн ₽ — остаток сети после агентских и РОП, до остальных расходов.</span>`;
  const px=i=>24+i/11*1070;
  const py=value=>115-value/2*90;
  $('#productivity-chart').innerHTML=`<svg viewBox="0 0 1120 158" role="img" aria-labelledby="pace-svg-title pace-svg-desc"><title id="pace-svg-title">План продуктивности, 2027</title><desc id="pace-svg-desc">${productivity.map((v,i)=>`${p.months[i]}: ${number(v,2)}`).join('; ')} сделки на агента в месяц.</desc><defs><linearGradient id="pace-gradient"><stop stop-color="#5c514a"/><stop offset="1" stop-color="#efc3a0"/></linearGradient></defs><line x1="24" x2="1094" y1="115" y2="115" stroke="#ffffff0d"/><path d="${productivity.map((v,i)=>`${i?'L':'M'}${px(i)},${py(v)}`).join(' ')}" fill="none" stroke="url(#pace-gradient)" stroke-width="2"/>${productivity.map((v,i)=>`<circle cx="${px(i)}" cy="${py(v)}" r="${i===11?4:2}" fill="${i===11?'#efc3a0':'#625348'}"/>`).join('')}${[0,2,5,8,11].map(i=>`<text x="${px(i)}" y="146" text-anchor="middle">${p.months[i]}</text>`).join('')}<text x="1094" y="13" text-anchor="end" fill="#d0a487">2,00</text></svg>`;

  const phases={
    prepare:{period:'ПРЕДЛАГАЕМЫЙ ЭТАП · НЕДЕЛИ 1–2',title:'Город. Люди.<br>Основа для старта.',lead:'До первых обязательств — понятная смета, местная команда и правила проверки.',points:[['Выбрать город и руководителя','Проверить условия рынка, формат работы и договоры.'],['Согласовать смету и предел расходов','Подготовка, аренда, команда, сервисы и резерв должны получить оценку.'],['Настроить учёт с первого дня','Раздельно фиксировать кандидатов, клиентов, каналы и оплаты.']]},
    pilot:{period:'ПРЕДЛАГАЕМЫЙ ЭТАП · НЕДЕЛИ 3–12',title:'Проверить.<br>Измерить. Понять.',lead:'Короткий тест даёт факты для следующего решения. Оплаты клиентских когорт требуют наблюдения.',points:[['Разделить найм опытных и новичков','Измерить выходы, удержание и время наставников по двум группам.'],['Проверить реальные клиентские каналы','От заявки и встречи до закрытой сделки и полученной комиссии.'],['Контролировать деньги каждые две недели','Следить за расходами и обязательствами. Наблюдение за оплатами — до шести месяцев.']]},
    scale:{period:'ПОСЛЕ ТЕСТА И ДОЗРЕВАНИЯ КОГОРТ',title:'Следующий офис —<br>следующее решение.',lead:'Расширение опирается на подтверждённую экономику и отдельно согласованный бюджет.',points:[['Подтвердить клиентскую экономику','Фактические комиссии и стоимость оплаченной сделки должны укладываться в согласованные условия.'],['Проверить команду и устойчивость','Местный руководитель, наставники, удержание и достаточная мощность обучения.'],['Пересчитать модель и утвердить лимит','Даты и финансирование следующего офиса подтверждаются решением собственницы.']]}
  };
  let phase='prepare';
  function showPhase(id){
    if(!phases[id])return;
    phase=id;const v=phases[id];
    $$('[data-phase]').forEach(button=>{const active=button.dataset.phase===id;button.setAttribute('aria-selected',active);button.tabIndex=active?0:-1;});
    $('#launch-detail').setAttribute('aria-labelledby',`phase-tab-${id}`);
    $('#launch-detail').innerHTML=`<div class="phase-title"><span>${v.period}</span><h3>${v.title}</h3><p>${v.lead}</p></div><div class="phase-points">${v.points.map(([title,text],i)=>`<div class="phase-point"><span>0${i+1}</span><div><b>${title}</b><p>${text}</p></div></div>`).join('')}</div>`;
  }
  $('#launch-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-phase]');if(button)showPhase(button.dataset.phase);});
  $('#launch-tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const ids=Object.keys(phases);const i=ids.indexOf(phase);const id=event.key==='Home'?ids[0]:event.key==='End'?ids.at(-1):ids[(i+(event.key==='ArrowRight'?1:-1)+ids.length)%ids.length];showPhase(id);$(`#phase-tab-${id}`).focus();});

  // Financial version 2.0 remains separate from the primary 3 → 18 strategy.
  const f=p.money;
  $('#finance-summary').innerHTML=[['Финансирование с резервом',f.financing],['Максимальный дефицит',f.deficit],['Дополнительный резерв',f.reserve],['Денежный поток 2027',f.cash2027],['Подготовка в 2026',f.preparation2026],['Денежный поток декабря 2029',f.december2029]].map(([title,value])=>`<div class="finance-cell"><span>${esc(title)}</span><strong>${million(value)} <small>млн ₽</small></strong></div>`).join('')+`<div class="finance-cell" style="grid-column:1/-1"><span>Денежная окупаемость</span><strong style="font-size:19px;letter-spacing:-.5px">${esc(f.payback)}</strong></div>`;
  $('#strategy-summary').innerHTML=`<table><caption style="text-align:left;font-size:10px;color:#999;margin-bottom:10px">Основная стратегия, план на 2027 · точные суммы в ₽</caption><thead><tr>${['Город','Январь, агенты','Декабрь, агенты','Средний чек, ₽','ВВ за год, ₽','Агентам 50%, ₽','РОПу 10%, ₽','До расходов, ₽'].map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${p.cities.map(c=>`<tr><th scope="row">${esc(c.name)}</th><td>${number(c.agents[0])}</td><td>${number(c.agents[11])}</td><td>${number(c.average)}</td><td>${number(c.annualRevenue)}</td><td>${number(c.agentPayment)}</td><td>${number(c.ropPayment)}</td><td>${number(c.beforeExpenses)}</td></tr>`).join('')}<tr><th scope="row">Сеть — всего</th><td>${number(p.totalAgents[0])}</td><td>${number(p.totalAgents[11])}</td><td>—</td><td>${number(p.annual.revenue)}</td><td>${number(p.annual.agentPayment)}</td><td>${number(p.annual.ropPayment)}</td><td>${number(p.annual.beforeExpenses)}</td></tr></tbody></table>`;
  $('#strategy-months').innerHTML=`<table><thead><tr>${['Месяц 2027','Агенты / офис','Агенты / сеть','Сделки / агент, план','Сделки / офис','Сделки / сеть','ВВ / сеть, ₽'].map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${p.months.map((m,i)=>`<tr><th scope="row">${longMonths[i]}</th><td>${number(p.cities[0].agents[i])}</td><td>${number(p.totalAgents[i])}</td><td>${number(productivity[i],2)}</td><td>${number(p.cities[0].deals[i],1)}</td><td>${number(p.totalDeals[i],1)}</td><td>${number(p.totalRevenue[i])}</td></tr>`).join('')}</tbody></table>`;
  $('#photo-credits').innerHTML=p.photoCredits.map(c=>`<article class="photo-credit"><h3>${esc(c.city)}</h3><p>Автор: ${esc(c.author)} · <a href="${safeURL(c.source)}" target="_blank" rel="noopener">Оригинал на Wikimedia Commons</a> · <a href="${safeURL(c.licenseUrl)}" target="_blank" rel="noopener">${esc(c.license)}</a></p><small>Уменьшение, преобразование в WebP, кадрирование и цветовая обработка в оформлении сайта. Фотография сохраняет условия указанной лицензии.</small></article>`).join('');
  let dialogTrigger=null;
  $$('[data-open]').forEach(button=>button.addEventListener('click',()=>{dialogTrigger=button;const dialog=document.getElementById(button.dataset.open);dialog.showModal();document.body.style.overflow='hidden';dialog.querySelector('[data-close]').focus();}));
  $$('dialog').forEach(dialog=>{
    dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{document.body.style.overflow='';dialogTrigger?.focus({preventScroll:true});});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  });

  const menu=$('#menu-toggle');
  function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Открыть меню');$('#mobile-nav').hidden=true;}
  menu.addEventListener('click',()=>{const active=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',active);menu.setAttribute('aria-label',active?'Закрыть меню':'Открыть меню');$('#mobile-nav').hidden=!active;});
  $$('#mobile-nav a').forEach(link=>link.addEventListener('click',closeMenu));
  window.matchMedia('(min-width: 781px)').addEventListener('change',closeMenu);

  const scenes=$$('.scene');
  let activeScene=0;
  let presenting=false;
  function updateControls(){
    $('#scene-indicator').textContent=`${String(activeScene+1).padStart(2,'0')} / ${String(scenes.length).padStart(2,'0')}`;
    $('#scene-name').textContent=scenes[activeScene].dataset.title;
    $('#previous-scene').disabled=activeScene===0;
    $('#next-scene').disabled=activeScene===scenes.length-1;
  }
  function goToScene(index){activeScene=Math.max(0,Math.min(index,scenes.length-1));scenes[activeScene].scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});updateControls();}
  function setPresentation(enabled){
    presenting=enabled;
    document.documentElement.classList.toggle('presenting',enabled);
    $('#presentation-toggle').setAttribute('aria-pressed',enabled);
    $('#presentation-toggle>span').textContent=enabled?'Выйти из показа':'Презентация';
    $('#presentation-controls').hidden=!enabled;
    closeMenu();updateControls();
    if(enabled){if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});goToScene(activeScene);}
    else if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});
  }
  $('#presentation-toggle').addEventListener('click',()=>setPresentation(!presenting));
  $('#exit-presentation').addEventListener('click',()=>setPresentation(false));
  $('#previous-scene').addEventListener('click',()=>goToScene(activeScene-1));
  $('#next-scene').addEventListener('click',()=>goToScene(activeScene+1));
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&presenting)setPresentation(false);});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();return;}
    if($('dialog[open]'))return;
    if(event.key==='Escape'&&presenting){setPresentation(false);return;}
    if(!presenting||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,textarea,select,[role="tablist"]'))return;
    if(event.key===' '&&event.target.closest('button,a'))return;
    if(['ArrowRight','ArrowDown','PageDown',' '].includes(event.key)){event.preventDefault();goToScene(activeScene+1);}
    else if(['ArrowLeft','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();goToScene(activeScene-1);}
    else if(event.key==='Home'){event.preventDefault();goToScene(0);}
    else if(event.key==='End'){event.preventDefault();goToScene(scenes.length-1);}
  });
  let queued=false;
  function onScroll(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const anchor=innerHeight*.4;let best=Infinity;scenes.forEach((scene,i)=>{const r=scene.getBoundingClientRect();const distance=anchor<r.top?r.top-anchor:anchor>r.bottom?anchor-r.bottom:0;if(distance<best){best=distance;activeScene=i;}});updateControls();if(!reduced.matches)$('#home').style.setProperty('--hero-progress',Math.max(0,Math.min(1,scrollY/800)).toFixed(3));});}
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});
  if(!reduced.matches&&'IntersectionObserver' in window){
    document.documentElement.classList.add('motion-ready');
    const reveal=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');reveal.unobserve(entry.target);}});},{rootMargin:'0px 0px -35px 0px',threshold:.08});
    $$('[data-reveal]').forEach(element=>reveal.observe(element));
    reduced.addEventListener('change',event=>{if(event.matches)document.documentElement.classList.remove('motion-ready');});
  }
  showCity(selectedCity);renderTeam();showPhase(phase);updateControls();onScroll();
})();
