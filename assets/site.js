(() => {
  'use strict';
  const p = window.PROJECT;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replaceAll('\u2014','–').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number = (value, digits = 0) => new Intl.NumberFormat('ru-RU',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
  const million = value => number(value / 1e6,2);
  const safeURL = value => {try {const u=new URL(value);return ['https:','http:'].includes(u.protocol)?esc(u.href):'#';}catch{return '#';}};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const longMonths = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  $$('[data-source]').forEach(link => link.href=p.sourceUrl);
  $$('[data-strategy]').forEach(link => link.href=`${p.sourceUrl}#gid=${p.strategyGid}`);
  $$('[data-advertising-source]').forEach(link=>link.href=`${p.sourceUrl}#gid=${p.advertising2027.gid}`);
  $$('[data-budget-source]').forEach(link=>link.href=`${p.sourceUrl}#gid=${p.budget2027.gid}`);

  // Each image is a local, attributed city photograph, not an office rendering.
  $('#city-monoliths').innerHTML=p.cities.map(c=>`<figure class="monolith"><a href="#cities" data-city="${c.id}" aria-label="Посмотреть ${esc(c.name)}"><img src="${c.image}" alt="" width="360" height="520"></a><figcaption>${esc(c.name)}</figcaption></figure>`).join('');
  const mapViewport=$('#russia-map-viewport');
  let mapZoom=1;
  $$('[data-map-zoom]').forEach(button=>button.addEventListener('click',()=>{
    if(!mapViewport)return;
    const cx=(mapViewport.scrollLeft+mapViewport.clientWidth/2)/Math.max(1,mapViewport.scrollWidth);
    const cy=(mapViewport.scrollTop+mapViewport.clientHeight/2)/Math.max(1,mapViewport.scrollHeight);
    mapZoom=button.dataset.mapZoom==='reset'?1:Math.max(1,Math.min(3,mapZoom+Number(button.dataset.mapZoom)*.5));
    mapViewport.style.setProperty('--map-zoom',String(mapZoom));
    mapViewport.scrollLeft=mapZoom===1?0:cx*mapViewport.scrollWidth-mapViewport.clientWidth/2;
    mapViewport.scrollTop=mapZoom===1?0:cy*mapViewport.scrollHeight-mapViewport.clientHeight/2;
    $('[data-map-zoom="-1"]').disabled=mapZoom===1;
    $('[data-map-zoom="1"]').disabled=mapZoom===3;
  }));
  // Separate target areas keep distant callout labels from covering other cities.
  $$('.map-project-city').forEach(link=>{
    const label=link.querySelector('text'),dot=link.querySelector('.map-city-dot');
    if(label){
      const box=label.getBBox(),target=document.createElementNS('http://www.w3.org/2000/svg','rect');
      for(const [key,value] of Object.entries({x:box.x-5,y:box.y-5,width:box.width+10,height:box.height+10,fill:'transparent',stroke:'none','pointer-events':'all'}))target.setAttribute(key,String(value));
      target.classList.add('map-city-label-hit-area');link.prepend(target);
    }
    if(dot){
      const target=document.createElementNS('http://www.w3.org/2000/svg','circle');
      for(const [key,value] of Object.entries({cx:dot.getAttribute('cx'),cy:dot.getAttribute('cy'),r:12,fill:'transparent',stroke:'none','pointer-events':'all'}))target.setAttribute(key,String(value));
      target.classList.add('map-city-dot-hit-area');link.prepend(target);
    }
  });
  let selectedCity=p.cities[0].id;
  $('#city-tabs').innerHTML=p.cities.map((c,i)=>`<button id="city-tab-${c.id}" role="tab" aria-selected="${i===0}" aria-controls="city-theatre" tabindex="${i===0?0:-1}" data-city-tab="${c.id}">${esc(c.name)}</button>`).join('');
  $('#economy-city-selector').innerHTML=p.cities.map((c,i)=>`<button data-economy-city="${c.id}" aria-pressed="${i===0}">${esc(c.name)}</button>`).join('');
  const budget=p.budget2027;
  const expenseMoney=value=>value==null?'Не заполнено':`${number(value)} ₽`;
  $('#budget-city-select').innerHTML=budget.cities.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#budget-overview').innerHTML=`<div class="finance-cell"><span>Пять новых офисов · без Воронежа</span><strong>${million(budget.reportedTotal)} <small>млн ₽ / год</small></strong></div><div class="finance-cell"><span>Первый месяц · пять новых офисов</span><strong>${million(budget.reportedMonths[0])} <small>млн ₽</small></strong></div>`;
  $('#budget-city-totals').innerHTML=`<table><thead><tr>${['Город','Январь, ₽','Декабрь, ₽','Итог за 2027, ₽'].map(v=>`<th scope="col">${v}</th>`).join('')}</tr></thead><tbody>${budget.cities.map(c=>`<tr><th scope="row">${esc(c.name)}</th><td>${expenseMoney(c.months[0])}</td><td>${expenseMoney(c.months[11])}</td><td>${expenseMoney(c.annual)}</td></tr>`).join('')}</tbody></table>`;
  function renderBudget(id){
    const c=budget.cities.find(c=>c.id===id);
    $('#budget-city-select').value=id;
    const monthRange=item=>{const values=item.months.slice(1);const lo=Math.min(...values),hi=Math.max(...values);return lo===hi?expenseMoney(lo):`${number(lo)}–${number(hi)} ₽`;};
    $('#budget-line-items').innerHTML=`<table><caption class="budget-caption">${esc(c.name)} · ${esc(c.sourceRows)}</caption><thead><tr>${['Статья','Разово, ₽','Январь, ₽','Фев–дек, ₽/мес','За 2027, ₽'].map(v=>`<th scope="col">${v}</th>`).join('')}</tr></thead><tbody>${c.items.map(item=>`<tr><th scope="row">${esc(item.label)}</th><td>${expenseMoney(item.launch)}</td><td>${expenseMoney(item.months[0])}</td><td>${monthRange(item)}</td><td>${expenseMoney(item.annual)}</td></tr>`).join('')}</tbody></table>`;
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
    $('#city-theatre').innerHTML=`<img class="city-image city-${id}" src="${c.image}" alt="${esc(c.name)} – вид города" width="1800" height="1200"><div class="city-shade" aria-hidden="true"></div><div class="city-slide-copy"><div class="city-slide-top"><span>${esc(c.region.toUpperCase())}</span><h3>${esc(c.name)}</h3></div><div class="city-slide-bottom"><p>${esc(c.intro)}</p><div class="city-plan-metric"><span>К ДЕКАБРЮ 2027</span><b>${number(c.agents[11])}</b><small>агентов</small></div></div></div><a class="city-photo-credit" href="${safeURL(credit.source)}" target="_blank" rel="noopener">Фото: ${esc(credit.author)} · ${esc(credit.license)}</a>`;
    $('#city-counter').textContent=`0${i+1} / 05`;
    $('#average-value').innerHTML=`${number(c.average)}<span>₽</span><sup aria-label="источник в примечании">*</sup>`;
    renderBudget(id);
    if(presenting)updateControls();
  }
  document.addEventListener('click',event=>{const link=event.target.closest('[data-city]');if(link)showCity(link.dataset.city);});
  $('#city-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-city-tab]');if(button)showCity(button.dataset.cityTab);});
  $('#economy-city-selector').addEventListener('click',event=>{const button=event.target.closest('[data-economy-city]');if(button){showCity(button.dataset.economyCity);scheduleEconomyRotation();}});
  function moveCity(delta){const i=p.cities.findIndex(c=>c.id===selectedCity);showCity(p.cities[(i+delta+p.cities.length)%p.cities.length].id);}
  $('#previous-city').addEventListener('click',()=>presenting?stepPresentation(-1):moveCity(-1));
  $('#previous-average').addEventListener('click',()=>{presenting?stepPresentation(-1):moveCity(-1);scheduleEconomyRotation();});
  $('#next-average').addEventListener('click',()=>{presenting?stepPresentation(1):moveCity(1);scheduleEconomyRotation();});
  $('#next-city').addEventListener('click',()=>presenting?stepPresentation(1):moveCity(1));
  $('#city-tabs').addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    const forward=['ArrowRight','ArrowDown','PageDown'].includes(event.key);
    const backward=['ArrowLeft','ArrowUp','PageUp'].includes(event.key);
    if(presenting&&scenes[activeScene].id==='cities'&&(forward||backward)){
      event.preventDefault();event.stopPropagation();stepPresentation(forward?1:-1);
      const focus=scenes[activeScene].id==='cities'?$(`#city-tab-${selectedCity}`):$(forward?'#next-scene':'#previous-scene');
      focus.focus({preventScroll:true});return;
    }
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='Home')showCity(p.cities[0].id);else if(event.key==='End')showCity(p.cities.at(-1).id);else moveCity(event.key==='ArrowRight'?1:-1);
    const tab=$(`#city-tab-${selectedCity}`);tab.focus({preventScroll:true});tab.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduced.matches?'instant':'smooth'});
  });

  let teamScope='office';
  function renderTeam(){
    const values=teamScope==='office'?p.cities[0].agents:p.totalAgents;
    const max=Math.max(...values);
    $('#team-value').textContent=number(values.at(-1));
    $('#team-unit').textContent=teamScope==='office'?'агентов на офис':'агентов в пяти городах';
    $$('[data-team-scope]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.teamScope===teamScope));
    $('#team-chart').setAttribute('role','img');
    $('#team-chart').setAttribute('aria-label',`План численности команды на 2027 год, ${teamScope==='office'?'один офис':'вся сеть'}: ${values.map((v,i)=>`${longMonths[i]} – ${v}`).join('; ')} агентов.`);
    $('#team-chart').innerHTML=values.map((value,i)=>`<div class="team-bar" aria-hidden="true"><div class="team-bar-track"><div class="team-bar-column${i===11?' final-bar':''}" style="--bar-height:${value/max*100}%"><span class="team-bar-value">${number(value)}</span></div></div><span class="team-bar-month" title="${longMonths[i]} 2027">${p.months[i]}</span></div>`).join('');
    if(presenting)updateControls();
  }
  $$('[data-team-scope]').forEach(button=>button.addEventListener('click',()=>{teamScope=button.dataset.teamScope;renderTeam();}));

  let economyRotationPaused=false;
  let economyRotationTimer=null;
  let economyVisible=false;
  function scheduleEconomyRotation(){
    clearTimeout(economyRotationTimer);
    if(presenting||economyRotationPaused||!economyVisible||document.hidden||$('dialog[open]'))return;
    economyRotationTimer=setTimeout(()=>{moveCity(1);scheduleEconomyRotation();},5000);
  }
  $('#economy-rotation-toggle').addEventListener('click',()=>{
    economyRotationPaused=!economyRotationPaused;
    const button=$('#economy-rotation-toggle');
    button.setAttribute('aria-pressed',economyRotationPaused);
    button.setAttribute('aria-label',economyRotationPaused?'Продолжить автоматическую смену городов':'Приостановить автоматическую смену городов');
    button.textContent=economyRotationPaused?'Продолжить':'Пауза';
    scheduleEconomyRotation();
  });
  if('IntersectionObserver' in window){
    const economyObserver=new IntersectionObserver(entries=>{
      const visible=entries[0].intersectionRatio>=.5;
      if(!presenting&&visible&&!economyVisible&&!economyRotationPaused)showCity(p.cities[0].id);
      economyVisible=visible;scheduleEconomyRotation();
    },{threshold:[0,.5]});
    economyObserver.observe($('#economics'));
  }else{
    const trackEconomy=()=>{const r=$('#economics').getBoundingClientRect();const visible=r.top<innerHeight*.5&&r.bottom>innerHeight*.5;if(visible!==economyVisible){economyVisible=visible;scheduleEconomyRotation();}};
    window.addEventListener('scroll',trackEconomy,{passive:true});trackEconomy();
  }
  document.addEventListener('visibilitychange',scheduleEconomyRotation);
  const productivity=p.cities[0].productivity;
  $('#deal-plan-summary').innerHTML=`<div><strong>${number(p.cities[0].annualDeals,1)}</strong><span>план сделок на офис за год<br><small>без Воронежа</small></span></div><div><strong>${number(p.annual.deals,1)}</strong><span>план сделок на всю сеть за год<br><small>без Воронежа</small></span></div>`;
  const px=i=>24+i/11*1070;
  const py=value=>115-value/2*90;
  $('#productivity-chart').innerHTML=`<svg viewBox="0 0 1120 158" role="img" aria-labelledby="pace-svg-title pace-svg-desc"><title id="pace-svg-title">План продуктивности, 2027</title><desc id="pace-svg-desc">${productivity.map((v,i)=>`${p.months[i]}: ${number(v,2)}`).join('; ')} сделки на агента в месяц.</desc><defs><linearGradient id="pace-gradient"><stop stop-color="#5c514a"/><stop offset="1" stop-color="#efc3a0"/></linearGradient></defs><line x1="24" x2="1094" y1="115" y2="115" stroke="#ffffff0d"/><path d="${productivity.map((v,i)=>`${i?'L':'M'}${px(i)},${py(v)}`).join(' ')}" fill="none" stroke="url(#pace-gradient)" stroke-width="2"/>${productivity.map((v,i)=>`<circle cx="${px(i)}" cy="${py(v)}" r="${i===11?4:2}" fill="${i===11?'#efc3a0':'#625348'}"/>`).join('')}${[0,2,5,8,11].map(i=>`<text x="${px(i)}" y="146" text-anchor="middle">${p.months[i]}</text>`).join('')}</svg>`;

  const phases={
  "prepare": {
    "title": "Подготовка",
    "lead": "",
    "points": [
      [
        "Назначить руководителя",
        "Команда и сроки найма."
      ],
      [
        "Утвердить бюджет",
        "Аренда, оборудование, сервисы, реклама."
      ],
      [
        "Подготовить офис",
        "Договоры, CRM и телефония."
      ]
    ]
  },
  "start": {
    "title": "Запуск",
    "lead": "",
    "points": [
      [
        "Обучить команду",
        "Сервисы, работа с клиентом, документы."
      ],
      [
        "Запустить рекламу",
        "Каналы, бюджет, распределение обращений."
      ],
      [
        "Провести первые сделки",
        "Поддержка агентов и проверка документов."
      ]
    ]
  },
  "scale": {
    "title": "Следующий офис",
    "lead": "",
    "points": [
      [
        "Сверить план и факт",
        "Команда, сделки, выручка, расходы."
      ],
      [
        "Обновить расчёты",
        "По результатам первого запуска."
      ],
      [
        "Утвердить следующий запуск",
        "Город, руководитель, бюджет, дата."
      ]
    ]
  }
};
  let phase='prepare';
  function showPhase(id){
    if(!phases[id])return;
    phase=id;const v=phases[id];
    $$('[data-phase]').forEach(button=>{const active=button.dataset.phase===id;button.setAttribute('aria-selected',active);button.tabIndex=active?0:-1;});
    $('#launch-detail').setAttribute('aria-labelledby',`phase-tab-${id}`);
    $('#launch-detail').innerHTML=`<div class="phase-title"><h3>${v.title}</h3></div><div class="phase-points">${v.points.map(([title,text],i)=>`<div class="phase-point"><span>0${i+1}</span><div><b>${title}</b><p>${text}</p></div></div>`).join('')}</div>`;
    if(presenting)updateControls();
  }
  $('#launch-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-phase]');if(button)showPhase(button.dataset.phase);});
  $('#launch-tabs').addEventListener('keydown',event=>{
    const forward=['ArrowRight','ArrowDown','PageDown'].includes(event.key);
    const backward=['ArrowLeft','ArrowUp','PageUp'].includes(event.key);
    if(presenting&&scenes[activeScene].id==='launch'&&(forward||backward)){
      event.preventDefault();event.stopPropagation();stepPresentation(forward?1:-1);
      const focus=scenes[activeScene].id==='launch'?$(`#phase-tab-${phase}`):$(forward?'#next-scene':'#previous-scene');
      focus.focus({preventScroll:true});return;
    }
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const ids=Object.keys(phases);const i=ids.indexOf(phase);const id=event.key==='Home'?ids[0]:event.key==='End'?ids.at(-1):ids[(i+(event.key==='ArrowRight'?1:-1)+ids.length)%ids.length];showPhase(id);$(`#phase-tab-${id}`).focus();
  });

  $('#payback-months').textContent=p.payback.minMonths==null?'–':`${p.payback.minMonths}–${p.payback.maxMonths}`;
  $('#payback-cities').innerHTML=p.cities.map(c=>`<li><span>${esc(c.name)}</span><strong${c.paybackMonths==null?' class="pending"':''}>${c.paybackMonths==null?'Уточняется':`${number(c.paybackMonths)} мес.`}</strong></li>`).join('');
  $('#payback-source-table').innerHTML=`<table><thead><tr><th scope="col">Город</th><th scope="col">Срок в месяцах</th><th scope="col">Ячейка</th><th scope="col">Результат исходной формулы</th></tr></thead><tbody>${p.cities.map(c=>`<tr><th scope="row">${esc(c.name)}</th><td>Уточняется</td><td>${esc(c.paybackSourceCell)}</td><td>${number(c.paybackSourceValue)} · не число месяцев</td></tr>`).join('')}</tbody></table>`;

  // Financial version 2.0 remains separate from the primary 3 → 18 strategy.
  const f=p.money;
  $('#finance-summary').innerHTML=[['Финансирование с резервом',f.financing],['Максимальный дефицит',f.deficit],['Дополнительный резерв',f.reserve],['Денежный поток 2027',f.cash2027],['Подготовка в 2026',f.preparation2026],['Денежный поток декабря 2029',f.december2029]].map(([title,value])=>`<div class="finance-cell"><span>${esc(title)}</span><strong>${million(value)} <small>млн ₽</small></strong></div>`).join('')+`<div class="finance-cell" style="grid-column:1/-1"><span>Денежная окупаемость</span><strong style="font-size:19px;letter-spacing:-.5px">${esc(f.payback)}</strong></div>`;
  $('#strategy-summary').innerHTML=`<table><caption style="text-align:left;font-size:10px;color:#999;margin-bottom:10px">Основная стратегия, план на 2027 · точные суммы в ₽</caption><thead><tr>${['Город','Январь, агенты','Декабрь, агенты','Средний чек, ₽','ВВ за год, ₽','Агентам 50%, ₽','РОПу 10%, ₽','До расходов, ₽'].map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${p.cities.map(c=>`<tr><th scope="row">${esc(c.name)}</th><td>${number(c.agents[0])}</td><td>${number(c.agents[11])}</td><td>${number(c.average)}</td><td>${number(c.annualRevenue)}</td><td>${number(c.agentPayment)}</td><td>${number(c.ropPayment)}</td><td>${number(c.beforeExpenses)}</td></tr>`).join('')}<tr><th scope="row">Сеть – всего</th><td>${number(p.totalAgents[0])}</td><td>${number(p.totalAgents[11])}</td><td>–</td><td>${number(p.annual.revenue)}</td><td>${number(p.annual.agentPayment)}</td><td>${number(p.annual.ropPayment)}</td><td>${number(p.annual.beforeExpenses)}</td></tr></tbody></table>`;
  $('#strategy-months').innerHTML=`<table><thead><tr>${['Месяц 2027','Агенты / офис','Агенты / пять новых офисов','Сделки / агент, план','Сделки / офис','Сделки / пять новых офисов','ВВ / пять новых офисов, ₽'].map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${p.months.map((m,i)=>`<tr><th scope="row">${longMonths[i]}</th><td>${number(p.cities[0].agents[i])}</td><td>${number(p.totalAgents[i])}</td><td>${number(productivity[i],2)}</td><td>${number(p.cities[0].deals[i],1)}</td><td>${number(p.totalDeals[i],1)}</td><td>${number(p.totalRevenue[i])}</td></tr>`).join('')}</tbody></table>`;
  $('#photo-credits').innerHTML=p.photoCredits.map(c=>`<article class="photo-credit"><h3>${esc(c.city)}</h3><p>Автор: ${esc(c.author)} · <a href="${safeURL(c.source)}" target="_blank" rel="noopener">Оригинал на Wikimedia Commons</a> · <a href="${safeURL(c.licenseUrl)}" target="_blank" rel="noopener">${esc(c.license)}</a></p></article>`).join('');
  document.addEventListener('click',event=>{
    const control=event.target.closest('[data-world-market]');if(!control)return;
    event.preventDefault();const market=window.MARKETS.find(m=>m.id===control.dataset.worldMarket);if(!market)return;
    $$('[data-world-market]').forEach(node=>{if(node.tagName==='BUTTON')node.setAttribute('aria-pressed',node.dataset.worldMarket===market.id);});
    $$('[data-market-shape]').forEach(node=>node.classList.toggle('is-selected',node.dataset.marketShape===market.id));
    const detail=$('#market-detail');
    if(detail)detail.innerHTML=`<p><strong>${esc(market.country)} · ${esc(market.city)}.</strong> ${esc(market.description)}</p>`;
    schedulePresentationFit();
  });
  let dialogTrigger=null;
  $$('[data-open]').forEach(button=>button.addEventListener('click',()=>{dialogTrigger=button;const dialog=document.getElementById(button.dataset.open);dialog.showModal();clearTimeout(economyRotationTimer);document.body.style.overflow='hidden';dialog.querySelector('[data-close]').focus();}));
  $$('dialog').forEach(dialog=>{
    dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{document.body.style.overflow='';scheduleEconomyRotation();dialogTrigger?.focus({preventScroll:true});});
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
  let presentationCanvases=[];
  let presentationFitFrame=0;
  const presentationResizeObserver='ResizeObserver' in window?new ResizeObserver(()=>schedulePresentationFit()):null;
  function schedulePresentationFit(){
    if(!presenting||presentationFitFrame)return;
    presentationFitFrame=requestAnimationFrame(()=>{presentationFitFrame=0;fitPresentation();});
  }
  function fitPresentation(){
    if(!presenting)return;
    const root=document.documentElement;
    const viewportHeight=window.visualViewport?.height||innerHeight;
    const headerBottom=$('.site-header').getBoundingClientRect().bottom;
    const controlsTop=$('#presentation-controls').getBoundingClientRect().top;
    root.style.setProperty('--presentation-viewport-height',`${viewportHeight}px`);
    root.style.setProperty('--presentation-top',`${Math.max(0,headerBottom)}px`);
    root.style.setProperty('--presentation-bottom',`${Math.max(64,viewportHeight-controlsTop+16)}px`);
    const stage=$('#main');
    const canvas=presentationCanvases[activeScene];
    if(!canvas)return;
    const edge=stage.clientWidth<=520?10:20;
    canvas.style.width=`${Math.max(240,Math.min(['vision','cis','world'].includes(scenes[activeScene].id)?1680:1360,stage.clientWidth-edge*2))}px`;
    const width=canvas.offsetWidth;
    const height=canvas.offsetHeight;
    const scale=Math.min(1,(stage.clientWidth-edge*2)/width,(stage.clientHeight-edge*2)/height);
    canvas.style.setProperty('--presentation-scale',String(Math.max(.05,scale)));
  }
  function mountPresentation(){
    presentationCanvases=scenes.map(scene=>{
      const canvas=document.createElement('div');canvas.className='presentation-canvas';
      while(scene.firstChild)canvas.append(scene.firstChild);
      scene.append(canvas);presentationResizeObserver?.observe(canvas);return canvas;
    });
  }
  function unmountPresentation(){
    presentationResizeObserver?.disconnect();
    if(presentationFitFrame)cancelAnimationFrame(presentationFitFrame);
    presentationFitFrame=0;
    presentationCanvases.forEach(canvas=>canvas.replaceWith(...canvas.childNodes));
    presentationCanvases=[];
    scenes.forEach(scene=>scene.classList.remove('presentation-active'));
    ['--presentation-viewport-height','--presentation-top','--presentation-bottom'].forEach(property=>document.documentElement.style.removeProperty(property));
  }
  function getPresentationStep(){
    const id=scenes[activeScene].id;
    if(id==='cities'||id==='economics')return {index:p.cities.findIndex(c=>c.id===selectedCity),labels:p.cities.map(c=>c.name),select:i=>showCity(p.cities[i].id)};
    if(id==='team'){
      const scopes=['office','network'];
      return {index:scopes.indexOf(teamScope),labels:scopes.map(scope=>$(`[data-team-scope="${scope}"]`).textContent),select:i=>{teamScope=scopes[i];renderTeam();}};
    }
    if(id==='launch'){
      const ids=Object.keys(phases);
      return {index:ids.indexOf(phase),labels:ids.map(id=>$(`#phase-tab-${id}`).textContent.replace(/^\s*\d+\s*/, '').trim()),select:i=>showPhase(ids[i])};
    }
    return null;
  }
  function updateControls(){
    const cityIndex=p.cities.findIndex(c=>c.id===selectedCity);
    const step=presenting?getPresentationStep():null;
    $('#scene-indicator').textContent=`${String(activeScene+1).padStart(2,'0')} / ${String(scenes.length).padStart(2,'0')}`;
    $('#scene-name').textContent=step?`${step.labels[step.index]} · ${step.index+1} / ${step.labels.length}`:scenes[activeScene].dataset.title;
    $('#previous-scene').disabled=activeScene===0;
    $('#next-scene').disabled=activeScene===scenes.length-1;
    $('#previous-city').setAttribute('aria-label',presenting&&cityIndex===0?'Предыдущий слайд':'Предыдущий город');
    $('#previous-average').setAttribute('aria-label',presenting&&cityIndex===0?'Предыдущий слайд':'Предыдущий средний чек');
    $('#next-average').setAttribute('aria-label',presenting&&cityIndex===p.cities.length-1?'Следующий слайд':'Следующий средний чек');
    $('#next-city').setAttribute('aria-label',presenting&&cityIndex===p.cities.length-1?'Следующий слайд':'Следующий город');
    schedulePresentationFit();
  }
  function goToScene(index){
    const previous=activeScene;
    const focusWasInside=scenes[previous].contains(document.activeElement);
    activeScene=Math.max(0,Math.min(index,scenes.length-1));
    if(presenting&&previous!==activeScene){const step=getPresentationStep();if(step)step.select(activeScene>previous?0:step.labels.length-1);}
    if(presenting){
      scenes.forEach((scene,i)=>scene.classList.toggle('presentation-active',i===activeScene));
      updateControls();fitPresentation();
      if(previous!==activeScene&&focusWasInside){
        let control=$(activeScene>previous?'#next-scene':'#previous-scene');
        if(control.disabled)control=$('#exit-presentation');
        control.focus({preventScroll:true});
      }
    }else{scenes[activeScene].scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});updateControls();}
  }
  function stepPresentation(delta){
    const step=getPresentationStep();
    if(step){
      const next=step.index+delta;
      if(next>=0&&next<step.labels.length){step.select(next);updateControls();return;}
    }
    goToScene(activeScene+delta);
  }
  function setPresentation(enabled){
    if(enabled===presenting)return;
    const returningScene=scenes[activeScene];
    presenting=enabled;
    scheduleEconomyRotation();
    document.documentElement.classList.toggle('presenting',enabled);
    $('#presentation-toggle').setAttribute('aria-pressed',enabled);
    $('#presentation-toggle>span').textContent=enabled?'Выйти из показа':'Презентация';
    $('#presentation-controls').hidden=!enabled;
    closeMenu();
    if(enabled){
      mountPresentation();goToScene(activeScene);
      if(document.documentElement.requestFullscreen&&!document.fullscreenElement){
        document.documentElement.requestFullscreen().then(()=>{
          if(presenting)schedulePresentationFit();
          else if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
        }).catch(schedulePresentationFit);
      }
    }else{
      unmountPresentation();updateControls();
      const restore=()=>requestAnimationFrame(()=>{if(!presenting)returningScene.scrollIntoView({block:'start',behavior:'instant'});});
      restore();
      if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().then(restore).catch(restore);
    }
  }
  $('#presentation-toggle').addEventListener('click',()=>setPresentation(!presenting));
  $('#exit-presentation').addEventListener('click',()=>setPresentation(false));
  $('#previous-scene').addEventListener('click',()=>stepPresentation(-1));
  $('#next-scene').addEventListener('click',()=>stepPresentation(1));
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&presenting)setPresentation(false);else schedulePresentationFit();});
  document.addEventListener('click',event=>{
    if(!presenting)return;
    const link=event.target.closest('a[href^="#"]');
    if(!link)return;
    const index=scenes.findIndex(scene=>`#${scene.id}`===link.getAttribute('href'));
    if(index<0)return;
    event.preventDefault();goToScene(index);
    if(link.dataset.city)showCity(link.dataset.city);
    else{const step=getPresentationStep();if(step)step.select(0);}
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();return;}
    if($('dialog[open]'))return;
    if(event.key==='Escape'&&presenting){setPresentation(false);return;}
    if(!presenting||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,textarea,select,[role="tablist"]'))return;
    if(event.key===' '&&event.target.closest('button,a'))return;
    if(['ArrowRight','ArrowDown','PageDown',' '].includes(event.key)){event.preventDefault();stepPresentation(1);}
    else if(['ArrowLeft','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();stepPresentation(-1);}
    else if(event.key==='Home'){event.preventDefault();goToScene(0);}
    else if(event.key==='End'){event.preventDefault();goToScene(scenes.length-1);}
  });
  let queued=false;
  function onScroll(){if(presenting){schedulePresentationFit();return;}if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(presenting){schedulePresentationFit();return;}const anchor=innerHeight*.4;let best=Infinity;scenes.forEach((scene,i)=>{const r=scene.getBoundingClientRect();const distance=anchor<r.top?r.top-anchor:anchor>r.bottom?anchor-r.bottom:0;if(distance<best){best=distance;activeScene=i;}});updateControls();if(!reduced.matches)$('#home').style.setProperty('--hero-progress',Math.max(0,Math.min(1,scrollY/800)).toFixed(3));});}
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});
  window.visualViewport?.addEventListener('resize',schedulePresentationFit,{passive:true});
  document.addEventListener('load',event=>{if(event.target.tagName==='IMG')schedulePresentationFit();},true);
  if(!reduced.matches&&'IntersectionObserver' in window){
    document.documentElement.classList.add('motion-ready');
    const reveal=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');reveal.unobserve(entry.target);}});},{rootMargin:'0px 0px -35px 0px',threshold:.08});
    $$('[data-reveal]').forEach(element=>reveal.observe(element));
    reduced.addEventListener('change',event=>{if(event.matches)document.documentElement.classList.remove('motion-ready');});
  }
  showCity(selectedCity);renderTeam();showPhase(phase);updateControls();onScroll();
})();
