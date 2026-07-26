const API_URL = 'http://localhost:3001';
const HUB_URL = 'http://localhost:3002';
const API_KEY_HEADER = 'X-FIS-EPN-KEY';
const API_KEY_STORAGE_KEY = 'epn-event-manager-demo-api-key';

let editingId = null;
let pendingDeletion = null;
let loadedProducts = [];
let apiKey = '';
let accessValidated = false;
let currentView = 'dashboard';
const knownEventSources = new Set(['cleaning-crud']);
let availableEventEntities = new Set();
const protectedViews = new Set([
  'products',
  'search',
  'inventory',
  'events',
  'stats',
  'evidence',
]);

const productForm = document.getElementById('productForm');
const productList = document.getElementById('productList');
const message = document.getElementById('appNotification');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const cancelBtn = document.getElementById('cancelBtn');
const closeBtn = document.querySelector('.close');
const deleteModal = document.getElementById('deleteModal');
const deleteModalMessage = document.getElementById('deleteModalMessage');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const crudStatus = document.getElementById('crudStatus');
const hubStatus = document.getElementById('hubStatus');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const apiKeyFeedback = document.getElementById('apiKeyFeedback');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
const responseTestName = document.getElementById('responseTestName');
const responseUrl = document.getElementById('responseUrl');
const responseStatus = document.getElementById('responseStatus');
const responseError = document.getElementById('responseError');
const responseJson = document.getElementById('responseJson');
const dashboardCrudStatus = document.getElementById('dashboardCrudStatus');
const dashboardHubStatus = document.getElementById('dashboardHubStatus');
const dashboardAccessStatus = document.getElementById('dashboardAccessStatus');
const dashboardActiveProducts = document.getElementById('dashboardActiveProducts');
const dashboardTotalProducts = document.getElementById('dashboardTotalProducts');
const dashboardTotalQuantity = document.getElementById('dashboardTotalQuantity');
const dashboardInventoryValue = document.getElementById('dashboardInventoryValue');
const dashboardRecentEvents = document.getElementById('dashboardRecentEvents');
const dashboardOperations = document.getElementById('dashboardOperations');
const searchResults = document.getElementById('searchResults');
const clearProductFiltersBtn = document.getElementById('clearProductFiltersBtn');
const clearEventFiltersBtn = document.getElementById('clearEventFiltersBtn');
const clearEventSearchBtn = document.getElementById('clearEventSearchBtn');
const clearRecentEventsBtn = document.getElementById('clearRecentEventsBtn');
const productLookupResult = document.getElementById('productLookupResult');
const eventFiltersSummary = document.getElementById('eventFiltersSummary');
const recentEventsMessage = document.getElementById('recentEventsMessage');
const createProductFollowup = document.getElementById('createProductFollowup');
const goToInventoryBtn = document.getElementById('goToInventoryBtn');
const protectedViewNotice = document.getElementById('protectedViewNotice');
const goToAccessBtn = document.getElementById('goToAccessBtn');
const dashboardAccessMessage = document.getElementById(
  'dashboardAccessMessage',
);
const protectedViewDescription = document.getElementById(
  'protectedViewDescription',
);

function getHeaders(includeApiKey = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (includeApiKey && apiKey) {
    headers[API_KEY_HEADER] = apiKey;
  }
  return headers;
}

function requireApiKey() {
  if (apiKey && accessValidated) return true;
  showMessage(
    'Primero valida la API Key configurada en el backend para habilitar esta operación.',
    'error',
  );
  return false;
}

function updateApiKeyStatus(feedback = '') {
  apiKeyStatus.textContent = accessValidated
    ? 'Acceso validado'
    : 'Acceso no validado';
  apiKeyStatus.className = `key-status ${accessValidated ? 'configured' : 'not-configured'}`;
  apiKeyFeedback.textContent =
    feedback || (accessValidated ? '•••••••• validada' : '');
  dashboardAccessStatus.textContent = accessValidated
    ? 'Validado'
    : 'No validado';
}

async function validateAccess(storedValue = '') {
  const value = (storedValue || apiKeyInput.value).trim();
  if (!value) {
    updateApiKeyStatus(
      'Ingresa la API Key configurada en el backend antes de validar el acceso.',
    );
    return;
  }

  apiKey = value;
  accessValidated = false;
  const url = `${API_URL}/products`;
  resetResponseConsole('Validación de acceso protegido', url);

  try {
    const result = await requestJson(url, {
      protectedRequest: true,
      validationRequest: true,
    });
    accessValidated = true;
    apiKeyInput.value = '';
    renderResponse(
      'Validación de acceso protegido',
      url,
      result.response,
      result.data,
    );
    updateApiKeyStatus(
      'Acceso validado. Las operaciones protegidas están habilitadas.',
    );
    loadedProducts = Array.isArray(result.data) ? result.data : [];
    updateCategoryOptions(loadedProducts);
    displayProducts(loadedProducts);
    showView(currentView);
    await loadOperationalData();
  } catch (error) {
    accessValidated = false;
    apiKey = '';
    resetOperationalData();
    renderRequestError('Validación de acceso protegido', url, error);
    if (error.response?.status === 401) {
      updateApiKeyStatus(
        'API Key inválida o no autorizada. Verifica que coincida con el valor configurado en el .env del backend.',
      );
    } else {
      updateApiKeyStatus(getFunctionalErrorMessage(error));
    }
  }
}

function closeAccess() {
  apiKey = '';
  accessValidated = false;
  localStorage.removeItem(API_KEY_STORAGE_KEY);
  apiKeyInput.value = '';
  updateApiKeyStatus(
    'Acceso cerrado. Valida nuevamente la API Key para consultar información operativa.',
  );
  resetOperationalData();
  showView(currentView);
}

async function checkStatus() {
  try {
    const crudRes = await fetch(`${API_URL}/health`);
    updateServiceStatus('cleaning-crud', crudRes.ok);
  } catch {
    updateServiceStatus('cleaning-crud', false);
  }

  try {
    const hubRes = await fetch(`${HUB_URL}/health`);
    updateServiceStatus('epn-event-manager', hubRes.ok);
  } catch {
    updateServiceStatus('epn-event-manager', false);
  }
}

function updateServiceStatus(service, isOnline) {
  const statusText = isOnline ? 'En línea' : 'Fuera de línea';
  const badgeText = isOnline ? '✅ En línea' : '❌ Fuera de línea';
  const badgeClass = `status-badge ${isOnline ? 'online' : 'offline'}`;

  if (service === 'cleaning-crud') {
    crudStatus.textContent = badgeText;
    crudStatus.className = badgeClass;
    dashboardCrudStatus.textContent = statusText;
  } else if (service === 'epn-event-manager') {
    hubStatus.textContent = badgeText;
    hubStatus.className = badgeClass;
    dashboardHubStatus.textContent = statusText;
  }
}

function getServiceFromUrl(url) {
  return url.startsWith(HUB_URL) ? 'epn-event-manager' : 'cleaning-crud';
}

function getFunctionalErrorMessage(error, operation = 'complete') {
  if (error.kind === 'missing-api-key') return error.message;

  if (error.kind === 'network') {
    if (error.service === 'epn-event-manager') {
      return 'No se pudo conectar con EPN Event Manager. Verifica que el servicio de eventos esté iniciado.';
    }
    return 'No se pudo conectar con cleaning-crud. Verifica que el servicio esté iniciado en localhost.';
  }

  const status = error.response?.status;
  if (status === 401) {
    return 'API Key inválida o no autorizada. Verifica que coincida con el valor configurado en el .env del backend.';
  }
  if (status === 400) {
    return operation === 'create'
      ? 'No se pudo registrar el producto. Revisa los datos ingresados.'
      : 'No se pudo completar la operación. Revisa los datos ingresados.';
  }
  if (status === 500) {
    return operation === 'create'
      ? 'Ocurrió un error interno al registrar el producto. Revisa la consola del servicio backend.'
      : 'Ocurrió un error interno al completar la operación. Revisa la consola del servicio backend.';
  }
  if (status) {
    return `No se pudo completar la operación. Código de respuesta: ${status}.`;
  }
  return 'No se pudo completar la operación. Intenta nuevamente.';
}

function showMessage(text, type = 'success') {
  message.textContent = text;
  message.className = `app-notification visible ${type}`;
  setTimeout(() => {
    message.className = 'app-notification';
  }, 4000);
}

function showView(viewName) {
  currentView = viewName;
  const viewIsLocked = protectedViews.has(viewName) && !accessValidated;
  document.querySelectorAll('.app-view').forEach((view) => {
    view.classList.toggle(
      'active',
      !viewIsLocked && view.dataset.view === viewName,
    );
  });
  protectedViewNotice.hidden = !viewIsLocked;
  protectedViewDescription.textContent =
    viewName === 'events'
      ? 'Valida la API Key configurada en el backend para consultar la trazabilidad del sistema.'
      : 'Valida la API Key configurada en el backend para consultar información operativa del sistema.';
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });
  if (!viewIsLocked && viewName === 'products') {
    showProductSubview('inventory');
  }
  if (!viewIsLocked && viewName === 'events') {
    showEventSubview('history');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showEventSubview(subviewName) {
  document.querySelectorAll('.event-subview').forEach((subview) => {
    subview.classList.toggle(
      'active-event-subview',
      subview.dataset.eventSubview === subviewName,
    );
  });
  document.querySelectorAll('.event-tab').forEach((tab) => {
    const isActive = tab.dataset.eventView === subviewName;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
}

function clearEventFilterValues() {
  document.getElementById('eventActionFilter').value = '';
  document.getElementById('eventSourceFilter').value = '';
  document.getElementById('eventEntityFilter').value = '';
}

function clearEventSearch() {
  clearEventFilterValues();
  eventFiltersSummary.textContent = 'Sin filtros aplicados.';
  document.getElementById('eventsTableBody').innerHTML =
    '<tr><td colspan="5">Selecciona filtros o consulta el historial para mostrar la trazabilidad del sistema.</td></tr>';
}

function clearRecentEvents() {
  document.getElementById('latestEventsLimit').value = '5';
  recentEventsMessage.textContent =
    'Selecciona cuántos eventos recientes deseas revisar.';
  document.getElementById('latestEventsTableBody').innerHTML =
    '<tr><td colspan="5">Selecciona cuántos eventos recientes deseas revisar.</td></tr>';
}

function showProductSubview(subviewName) {
  document.querySelectorAll('.product-subview').forEach((subview) => {
    subview.classList.toggle(
      'active-subview',
      subview.dataset.productSubview === subviewName,
    );
  });
  document.querySelectorAll('.product-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.productView === subviewName);
  });
}

function formatMoney(value) {
  return `$ ${Number(value || 0).toFixed(2)}`;
}

function resetProtectedMetrics() {
  dashboardActiveProducts.textContent = '—';
  dashboardTotalProducts.textContent = '—';
  dashboardTotalQuantity.textContent = '—';
  dashboardInventoryValue.textContent = '—';
}

function resetOperationalData() {
  loadedProducts = [];
  availableEventEntities = new Set();
  resetProtectedMetrics();
  dashboardRecentEvents.textContent = '—';
  dashboardOperations.textContent = '—';
  dashboardAccessMessage.hidden = false;

  document.getElementById('inventoryActiveProducts').textContent = '—';
  document.getElementById('inventoryTotalQuantity').textContent = '—';
  document.getElementById('inventoryTotalValue').textContent = '—';
  document.getElementById('productStatsSummary').textContent =
    'Valida el acceso para consultar estadísticas de productos.';
  productList.innerHTML =
    '<div class="product-card empty">Acceso requerido para consultar el inventario.</div>';
  searchResults.innerHTML =
    '<div class="empty-state"><div class="empty-state-text">Acceso requerido para buscar productos.</div></div>';
  productLookupResult.textContent =
    'Acceso requerido para consultar productos por ID.';
  createProductFollowup.hidden = true;

  document.getElementById('eventsTableBody').innerHTML =
    '<tr><td colspan="5">Acceso requerido para consultar el historial de eventos.</td></tr>';
  document.getElementById('latestEventsTableBody').innerHTML =
    '<tr><td colspan="5">Acceso requerido para consultar la actividad reciente.</td></tr>';
  recentEventsMessage.textContent =
    'Selecciona cuántos eventos recientes deseas revisar.';
  eventFiltersSummary.textContent = 'Sin datos operativos cargados.';
  updateEventEntityOptions([], true);

  ['statCreate', 'statUpdate', 'statDelete', 'statQuery', 'statTotal'].forEach(
    (id) => {
      document.getElementById(id).textContent = '—';
    },
  );
  document.getElementById('statsBars').innerHTML = '';
  document.getElementById('statsMessage').textContent =
    'Valida el acceso para consultar estadísticas de eventos.';

  productForm.reset();
  closeEditModal();
  closeDeleteModal();
}

function renderInventorySummary(data = {}) {
  const activeProducts = Number(data.activeProducts || 0);
  const totalQuantity = Number(data.totalQuantity || 0);
  const totalValue = Number(data.totalInventoryValue || 0);
  document.getElementById('inventoryActiveProducts').textContent = activeProducts;
  document.getElementById('inventoryTotalQuantity').textContent = totalQuantity;
  document.getElementById('inventoryTotalValue').textContent =
    formatMoney(totalValue);
  dashboardActiveProducts.textContent = activeProducts;
  dashboardTotalQuantity.textContent = totalQuantity;
  dashboardInventoryValue.textContent = formatMoney(totalValue);
}

function renderSearchProducts(products) {
  if (!Array.isArray(products) || products.length === 0) {
    searchResults.innerHTML =
      '<div class="empty-state"><div class="empty-state-text">No se encontraron productos con los criterios seleccionados.</div></div>';
    return;
  }
  searchResults.innerHTML = products
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-header">
            <div class="product-title">${escapeHtml(product.name)}</div>
            <span class="product-category">${escapeHtml(product.category)}</span>
          </div>
          <div class="product-details">
            <div class="detail-item"><span class="detail-label">Cantidad</span><span class="detail-value">${product.quantity}</span></div>
            <div class="detail-item"><span class="detail-label">Precio</span><span class="detail-value">${formatMoney(product.price)}</span></div>
          </div>
        </article>`,
    )
    .join('');
}

function renderProductLookup(product) {
  productLookupResult.innerHTML = `
    <article class="product-card lookup-card">
      <div class="product-header">
        <div class="product-title">${escapeHtml(product.name)}</div>
        <span class="product-category">${escapeHtml(product.category)}</span>
      </div>
      <p class="product-description">${escapeHtml(product.description || 'Sin descripción')}</p>
      <div class="product-details">
        <div class="detail-item"><span class="detail-label">Cantidad</span><span class="detail-value">${product.quantity}</span></div>
        <div class="detail-item"><span class="detail-label">Precio unitario</span><span class="detail-value">${formatMoney(product.price)}</span></div>
        <div class="detail-item"><span class="detail-label">Estado</span><span class="active-product-badge">Activo</span></div>
      </div>
    </article>`;
}

function updateCategoryOptions(products) {
  const select = document.getElementById('productCategoryFilter');
  const selected = select.value;
  const categories = [
    ...new Set(
      (Array.isArray(products) ? products : [])
        .map((product) => String(product.category || '').trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const defaults = ['desinfectantes', 'detergentes', 'papel', 'otro'];
  const options = [...new Set([...defaults, ...categories])];
  select.innerHTML =
    '<option value="">Todas las categorías</option>' +
    options
      .map(
        (category) =>
          `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`,
      )
      .join('');
  if (options.includes(selected)) select.value = selected;
}

function eventValue(event, ...names) {
  for (const name of names) {
    if (event?.[name] !== undefined && event[name] !== null) return event[name];
  }
  return '';
}

function updateEventSourceOptions(events) {
  if (Array.isArray(events)) {
    events.forEach((event) => {
      const source = String(eventValue(event, 'source')).trim();
      if (source) knownEventSources.add(source);
    });
  }

  const select = document.getElementById('eventSourceFilter');
  const selected = select.value;
  select.innerHTML =
    '<option value="">Todos los orígenes</option>' +
    [...knownEventSources]
      .sort((sourceA, sourceB) => sourceA.localeCompare(sourceB))
      .map(
        (source) =>
          `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`,
      )
      .join('');
  if (knownEventSources.has(selected)) select.value = selected;
}

function updateEventEntityOptions(events, replace = false) {
  const entities = new Set(
    (Array.isArray(events) ? events : [])
      .map((event) => String(eventValue(event, 'entity')).trim())
      .filter(Boolean),
  );

  availableEventEntities = replace
    ? entities
    : new Set([...availableEventEntities, ...entities]);

  const select = document.getElementById('eventEntityFilter');
  const selected = select.value;
  select.innerHTML =
    '<option value="">Todas las entidades</option>' +
    [...availableEventEntities]
      .sort((entityA, entityB) => entityA.localeCompare(entityB))
      .map(
        (entity) =>
          `<option value="${escapeHtml(entity)}">${escapeHtml(entity)}</option>`,
      )
      .join('');
  select.value = availableEventEntities.has(selected) ? selected : '';
}

function parseLocalDateString(value) {
  const match = String(value)
    .trim()
    .match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?$/i,
    );
  if (!match) return null;

  let first = Number(match[1]);
  let second = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const secondValue = Number(match[6] || 0);
  const period = (match[7] || '').toLowerCase().replace(/[\s.]/g, '');

  if (period === 'pm' && hour < 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  // Si el segundo componente supera 12, el texto usa mes/día/año.
  // En los demás casos se prioriza el formato local día/mes/año.
  const month = second > 12 ? first : second;
  const day = second > 12 ? second : first;
  const parsed = new Date(year, month - 1, day, hour, minute, secondValue);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function formatEventDate(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 'Fecha no disponible';
  }

  const nativeDate = new Date(value);
  const parsedDate = Number.isNaN(nativeDate.getTime())
    ? parseLocalDateString(value)
    : nativeDate;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsedDate);
}

function getEventDate(event) {
  return eventValue(
    event,
    'recorded_at',
    'timestamp',
    'createdAt',
    'event_date',
    'eventDate',
    'occurredAt',
    'created_at',
    'date',
  );
}

function getEventTimestamp(event) {
  const value = getEventDate(event);
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const nativeTimestamp = new Date(value).getTime();
  if (!Number.isNaN(nativeTimestamp)) return nativeTimestamp;

  const localDate = parseLocalDateString(value);
  return localDate && !Number.isNaN(localDate.getTime())
    ? localDate.getTime()
    : null;
}

function sortRecentEvents(events, limit = Number.POSITIVE_INFINITY) {
  if (!Array.isArray(events)) return [];

  return events
    .map((event, originalIndex) => ({
      event,
      originalIndex,
      timestamp: getEventTimestamp(event),
    }))
    .sort((eventA, eventB) => {
      if (eventA.timestamp === null && eventB.timestamp === null) {
        return eventA.originalIndex - eventB.originalIndex;
      }
      if (eventA.timestamp === null) return 1;
      if (eventB.timestamp === null) return -1;
      return (
        eventB.timestamp - eventA.timestamp ||
        eventA.originalIndex - eventB.originalIndex
      );
    })
    .slice(0, limit)
    .map(({ event }) => event);
}

function renderEventsTable(events, targetId, emptyMessage) {
  updateEventSourceOptions(events);
  const target = document.getElementById(targetId);
  if (!Array.isArray(events) || events.length === 0) {
    target.innerHTML = `<tr><td colspan="5">${emptyMessage}</td></tr>`;
    return;
  }
  target.innerHTML = events
    .map((event) => {
      const date = getEventDate(event);
      const title = eventValue(event, 'title', 'description', 'message');
      return `<tr>
        <td>${escapeHtml(formatEventDate(date))}</td>
        <td><span class="action-badge">${escapeHtml(eventValue(event, 'action'))}</span></td>
        <td>${escapeHtml(eventValue(event, 'source'))}</td>
        <td>${escapeHtml(eventValue(event, 'entity'))}</td>
        <td>${escapeHtml(title || 'Sin descripción')}</td>
      </tr>`;
    })
    .join('');
}

function updateEventFiltersSummary(showAll = false) {
  const action = document.getElementById('eventActionFilter').value;
  const source = document.getElementById('eventSourceFilter').value;
  const entity = document.getElementById('eventEntityFilter').value;
  const filters = [];
  if (action) filters.push(`Acción ${action}`);
  if (source) filters.push(`Origen ${source}`);
  if (entity) filters.push(`Entidad ${entity}`);

  if (showAll) {
    eventFiltersSummary.textContent =
      'Historial completo: se muestran eventos de todas las acciones, orígenes y entidades.';
    return;
  }
  if (filters.length === 0) {
    eventFiltersSummary.textContent = 'Sin filtros aplicados.';
    return;
  }

  eventFiltersSummary.innerHTML = `<strong>Filtros aplicados:</strong> ${filters.join(
    ' · ',
  )}${
    filters.length > 1
      ? '<br>Se muestran eventos que cumplen todos los filtros seleccionados.'
      : ''
  }`;
}

function renderEventStats(data = {}) {
  const values = {
    create: Number(data.create || 0),
    update: Number(data.update || 0),
    delete: Number(data.delete || 0),
    query: Number(data.query || 0),
  };
  const total = Number(data.total || 0);
  document.getElementById('statCreate').textContent = values.create;
  document.getElementById('statUpdate').textContent = values.update;
  document.getElementById('statDelete').textContent = values.delete;
  document.getElementById('statQuery').textContent = values.query;
  document.getElementById('statTotal').textContent = total;
  dashboardOperations.textContent = total;
  const maximum = Math.max(...Object.values(values), 1);
  document.getElementById('statsBars').innerHTML = Object.entries(values)
    .map(
      ([label, value]) => `
        <div class="stat-bar-row">
          <strong>${label.toUpperCase()}</strong>
          <div class="stat-bar-track"><span style="width:${(value / maximum) * 100}%"></span></div>
          <b>${value}</b>
        </div>`,
    )
    .join('');
  document.getElementById('statsMessage').textContent =
    total === 0
      ? 'No existen eventos registrados. Las estadísticas se mantienen en cero.'
      : 'El total corresponde a la suma de las acciones registradas.';
}

async function loadDashboardData() {
  if (!accessValidated) {
    resetProtectedMetrics();
    dashboardRecentEvents.textContent = '—';
    dashboardOperations.textContent = '—';
    dashboardAccessMessage.hidden = false;
    return;
  }

  dashboardAccessMessage.hidden = true;
  try {
    const [latest, stats] = await Promise.all([
      requestJson(`${HUB_URL}/events/latest?limit=5`),
      requestJson(`${HUB_URL}/stats`),
    ]);
    dashboardRecentEvents.textContent = Array.isArray(latest.data)
      ? latest.data.length
      : 0;
    renderEventStats(stats.data);
  } catch {
    dashboardRecentEvents.textContent = '—';
    dashboardOperations.textContent = '—';
  }

  try {
    const [summary, products] = await Promise.all([
      requestJson(`${API_URL}/products/active-summary`, {
        protectedRequest: true,
      }),
      requestJson(`${API_URL}/products`, { protectedRequest: true }),
    ]);
    renderInventorySummary(summary.data);
    dashboardTotalProducts.textContent = Array.isArray(products.data)
      ? products.data.length
      : 0;
  } catch {
    resetProtectedMetrics();
  }
}

async function loadOperationalEvents() {
  if (!accessValidated) return;

  const [historyResult, latestResult, statsResult] = await Promise.allSettled([
    requestJson(`${HUB_URL}/events`),
    requestJson(`${HUB_URL}/events/latest?limit=5`),
    requestJson(`${HUB_URL}/stats`),
  ]);

  if (historyResult.status === 'fulfilled') {
    updateEventEntityOptions(historyResult.value.data, true);
    renderEventsTable(
      historyResult.value.data,
      'eventsTableBody',
      'No existen eventos registrados.',
    );
    updateEventFiltersSummary(true);
  }
  if (latestResult.status === 'fulfilled') {
    renderEventsTable(
      sortRecentEvents(latestResult.value.data, 5),
      'latestEventsTableBody',
      'No existen eventos recientes registrados.',
    );
    recentEventsMessage.textContent =
      'Los eventos se muestran del más reciente al más antiguo.';
  }
  if (statsResult.status === 'fulfilled') {
    renderEventStats(statsResult.value.data);
  }
}

async function loadOperationalData() {
  if (!accessValidated) return;
  await Promise.allSettled([
    loadProducts(),
    loadDashboardData(),
    loadOperationalEvents(),
  ]);
}

async function refreshEventsAfterProductCreation() {
  try {
    const [createdEvents, latestEvents] = await Promise.all([
      requestJson(
        `${HUB_URL}/events?${new URLSearchParams({
          action: 'CREATE',
          source: 'cleaning-crud',
          entity: 'product',
        })}`,
      ),
      requestJson(`${HUB_URL}/events/latest?limit=5`),
    ]);

    updateEventEntityOptions(createdEvents.data);
    document.getElementById('eventActionFilter').value = 'CREATE';
    document.getElementById('eventSourceFilter').value = 'cleaning-crud';
    document.getElementById('eventEntityFilter').value = 'product';
    renderEventsTable(
      createdEvents.data,
      'eventsTableBody',
      'No se encontraron eventos con los filtros seleccionados.',
    );
    updateEventFiltersSummary();
    renderEventsTable(
      sortRecentEvents(latestEvents.data, 5),
      'latestEventsTableBody',
      'No existen eventos recientes registrados.',
    );
    recentEventsMessage.textContent =
      'Los eventos se muestran del más reciente al más antiguo.';
    dashboardRecentEvents.textContent = Array.isArray(latestEvents.data)
      ? latestEvents.data.length
      : 0;

    return {
      visible:
        Array.isArray(createdEvents.data) && createdEvents.data.length > 0,
      connectionError: false,
    };
  } catch (error) {
    return {
      visible: false,
      connectionError: error.kind === 'network',
    };
  }
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(response, data) {
  if (response.status === 401) {
    return 'API Key inválida o no autorizada. Verifica que coincida con el valor configurado en el .env del backend.';
  }

  if (Array.isArray(data?.message)) return data.message.join(', ');
  if (data?.message) return data.message;
  return `La API respondió con HTTP ${response.status}.`;
}

async function requestJson(
  url,
  {
    method = 'GET',
    body,
    protectedRequest = false,
    validationRequest = false,
  } = {},
) {
  if (protectedRequest && (!apiKey || (!accessValidated && !validationRequest))) {
    const error = new Error(
      'Primero valida la API Key configurada en el backend para habilitar esta operación.',
    );
    error.kind = 'missing-api-key';
    throw error;
  }

  const service = getServiceFromUrl(url);
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: getHeaders(protectedRequest),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    updateServiceStatus(service, true);
  } catch (originalError) {
    updateServiceStatus(service, false);
    const error = new Error(
      service === 'epn-event-manager'
        ? 'No se pudo conectar con EPN Event Manager.'
        : 'No se pudo conectar con cleaning-crud.',
    );
    error.kind = 'network';
    error.service = service;
    error.url = url;
    error.method = method;
    error.cause = originalError;
    throw error;
  }
  const data = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(getErrorMessage(response, data));
    error.response = response;
    error.data = data;
    error.service = service;
    error.url = url;
    error.method = method;
    throw error;
  }

  return { response, data };
}

function resetResponseConsole(testName, url) {
  responseTestName.textContent = testName;
  responseUrl.textContent = url;
  responseStatus.textContent = 'Consultando...';
  responseStatus.className = 'http-status pending';
  responseError.textContent = '';
  responseJson.textContent = '';
}

function renderResponse(testName, url, response, data) {
  responseTestName.textContent = testName;
  responseUrl.textContent = url;
  responseStatus.textContent = `${response.status} ${response.statusText}`;
  responseStatus.className = 'http-status success';
  responseError.textContent = '';
  responseJson.textContent = JSON.stringify(data, null, 2);
}

function renderRequestError(testName, url, error) {
  responseTestName.textContent = testName;
  responseUrl.textContent = url;
  if (error.response) {
    responseStatus.textContent = `${error.response.status} ${error.response.statusText}`;
    responseJson.textContent = JSON.stringify(error.data, null, 2);
  } else if (error.kind === 'missing-api-key') {
    responseStatus.textContent = 'Solicitud no enviada';
    responseJson.textContent = '';
  } else {
    responseStatus.textContent = 'Error de red';
    responseJson.textContent = '';
  }
  responseStatus.className = 'http-status error';
  responseError.textContent = error.message;
}

function endpointRequest(requestName) {
  switch (requestName) {
    case 'products':
      return {
        testName: 'Ticket #46 · Listado y exclusión de eliminados',
        url: `${API_URL}/products`,
        protectedRequest: true,
      };
    case 'products-search': {
      const name = document.getElementById('productNameFilter').value.trim();
      const category = document
        .getElementById('productCategoryFilter')
        .value.trim();
      const filters = {};
      if (name) filters.name = name;
      if (category) filters.category = category;
      return {
        testName: 'Ticket #46 · Consulta del catálogo de productos',
        url: `${API_URL}/products${
          Object.keys(filters).length
            ? `?${new URLSearchParams(filters)}`
            : ''
        }`,
        protectedRequest: true,
      };
    }
    case 'products-name': {
      const name = document.getElementById('productNameFilter').value.trim();
      if (!name) throw new Error('Ingresa un nombre para probar este filtro.');
      return {
        testName: 'Ticket #46 · Búsqueda parcial por nombre',
        url: `${API_URL}/products?${new URLSearchParams({ name })}`,
        protectedRequest: true,
      };
    }
    case 'products-category': {
      const category = document
        .getElementById('productCategoryFilter')
        .value.trim();
      if (!category) throw new Error('Ingresa una categoría para probar este filtro.');
      return {
        testName: 'Ticket #46 · Búsqueda normalizada por categoría',
        url: `${API_URL}/products?${new URLSearchParams({ category })}`,
        protectedRequest: true,
      };
    }
    case 'products-combined': {
      const name = document.getElementById('productNameFilter').value.trim();
      const category = document
        .getElementById('productCategoryFilter')
        .value.trim();
      if (!name || !category) {
        throw new Error('Ingresa nombre y categoría para probar la condición AND.');
      }
      return {
        testName: 'Ticket #46 · Búsqueda combinada con condición AND',
        url: `${API_URL}/products?${new URLSearchParams({ name, category })}`,
        protectedRequest: true,
      };
    }
    case 'product-not-found': {
      const id = document.getElementById('missingProductId').value.trim();
      if (!id) throw new Error('Ingresa un ID inexistente para ejecutar la prueba.');
      return {
        testName: 'Ticket #44 · Producto inexistente devuelve 404',
        url: `${API_URL}/products/${encodeURIComponent(id)}`,
        protectedRequest: true,
      };
    }
    case 'products-summary':
      return {
        testName: 'Ticket #49 · Resumen de productos activos',
        url: `${API_URL}/products/active-summary`,
        protectedRequest: true,
      };
    case 'products-stats':
      return {
        testName: 'Regresión · Estadísticas de productos',
        url: `${API_URL}/products/stats`,
        protectedRequest: true,
      };
    case 'events':
      return {
        testName: 'Ticket #45 · Regresión del listado de eventos',
        url: `${HUB_URL}/events`,
        protectedRequest: false,
      };
    case 'events-filtered': {
      const action = document.getElementById('eventActionFilter').value;
      const source = document.getElementById('eventSourceFilter').value.trim();
      const entity = document.getElementById('eventEntityFilter').value.trim();
      const filters = {};
      if (action) filters.action = action;
      if (source) filters.source = source;
      if (entity) filters.entity = entity;
      return {
        testName: 'Ticket #40 · Filtros de eventos individuales o combinados',
        url: `${HUB_URL}/events${
          Object.keys(filters).length
            ? `?${new URLSearchParams(filters)}`
            : ''
        }`,
        protectedRequest: false,
      };
    }
    case 'events-empty-filter':
      return {
        testName: 'Ticket #40 · Rechazo de filtro vacío',
        url: `${HUB_URL}/events?source=`,
        protectedRequest: false,
      };
    case 'events-latest':
      {
        const limit = document.getElementById('latestEventsLimit').value.trim();
        if (!limit) throw new Error('Ingresa un límite para los últimos eventos.');
        return {
          testName: 'Ticket #43 · Últimos eventos y validación del límite',
          url: `${HUB_URL}/events/latest?${new URLSearchParams({ limit })}`,
          protectedRequest: false,
        };
      }
    case 'events-stats':
      return {
        testName: 'Tickets #48 y #50 · Estadísticas estables de eventos',
        url: `${HUB_URL}/stats`,
        protectedRequest: false,
      };
    default:
      throw new Error('Endpoint de demostración no reconocido.');
  }
}

async function runDemoRequest(requestName) {
  if (!requireApiKey()) return;

  let request;
  try {
    request = endpointRequest(requestName);
    if (requestName === 'events') clearEventFilterValues();
    resetResponseConsole(request.testName, request.url);
    const result = await requestJson(request.url, request);
    renderResponse(
      request.testName,
      request.url,
      result.response,
      result.data,
    );
    if (requestName === 'products') {
      loadedProducts = Array.isArray(result.data) ? result.data : [];
      updateCategoryOptions(loadedProducts);
      displayProducts(loadedProducts);
      showMessage('Inventario actualizado correctamente.');
    } else if (requestName === 'products-search') {
      renderSearchProducts(result.data);
    } else if (requestName === 'product-not-found') {
      renderProductLookup(result.data);
      showMessage('Producto encontrado.');
    } else if (requestName === 'products-summary') {
      renderInventorySummary(result.data);
      showMessage('Resumen de inventario actualizado.');
    } else if (requestName === 'products-stats') {
      const stats = result.data || {};
      document.getElementById('productStatsSummary').innerHTML = `
        <div class="summary-chips">
          <span><b>${Number(stats.totalProducts || 0)}</b> productos</span>
          <span><b>${Number(stats.totalQuantity || 0)}</b> unidades</span>
          <span><b>${formatMoney(stats.totalInventoryValue)}</b> valor total</span>
          <span><b>${formatMoney(stats.averagePrice)}</b> precio promedio</span>
        </div>
        <small>${escapeHtml(stats.message || 'Estadísticas actualizadas.')}</small>`;
    } else if (requestName === 'events' || requestName === 'events-filtered') {
      updateEventEntityOptions(result.data, requestName === 'events');
      renderEventsTable(
        result.data,
        'eventsTableBody',
        'No se encontraron eventos con los filtros seleccionados.',
      );
      updateEventFiltersSummary(requestName === 'events');
    } else if (requestName === 'events-latest') {
      updateEventEntityOptions(result.data);
      const limit = Number(
        document.getElementById('latestEventsLimit').value.trim(),
      );
      renderEventsTable(
        sortRecentEvents(result.data, limit),
        'latestEventsTableBody',
        'No existen eventos recientes registrados.',
      );
      recentEventsMessage.textContent =
        'Los eventos se muestran del más reciente al más antiguo.';
    } else if (requestName === 'events-stats') {
      renderEventStats(result.data);
    }
  } catch (error) {
    const url = request?.url || 'Solicitud no construida';
    const testName = request?.testName || 'Prueba no ejecutada';
    renderRequestError(testName, url, error);
    if (requestName === 'product-not-found' && error.response?.status === 404) {
      productLookupResult.textContent =
        'Producto no encontrado. No se realizó ninguna modificación en el inventario.';
      showMessage(
        'Producto no encontrado. No se realizó ninguna modificación en el inventario.',
        'error',
      );
    } else {
      showMessage(getFunctionalErrorMessage(error), 'error');
    }
  }
}

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!requireApiKey()) return;
  createProductFollowup.hidden = true;

  const name = document.getElementById('name').value.trim();
  const category = document.getElementById('category').value;
  const quantityValue = document.getElementById('quantity').value;
  const priceValue = document.getElementById('price').value;
  if (!name) {
    showMessage('El nombre del producto es obligatorio.', 'error');
    return;
  }
  if (!category) {
    showMessage('Selecciona una categoría para el producto.', 'error');
    return;
  }
  if (
    quantityValue === '' ||
    !Number.isFinite(Number(quantityValue)) ||
    Number(quantityValue) < 0
  ) {
      showMessage(
        'La cantidad debe ser un número válido.',
      'error',
    );
    return;
  }
  if (
    priceValue === '' ||
    !Number.isFinite(Number(priceValue)) ||
    Number(priceValue) < 0
  ) {
    showMessage('El precio debe ser un número válido.', 'error');
    return;
  }

  const product = {
    name,
    category,
    quantity: Number(quantityValue),
    price: Number(priceValue),
    description: document.getElementById('description').value,
  };

  try {
    loadingSpinner.classList.add('active');
    const url = `${API_URL}/products`;
    resetResponseConsole('Crear producto', url);
    const result = await requestJson(url, {
      method: 'POST',
      body: product,
      protectedRequest: true,
    });
    renderResponse('Crear producto', url, result.response, result.data);
    productForm.reset();
    await loadProducts();
    const eventResult = await refreshEventsAfterProductCreation();
    createProductFollowup.hidden = false;
    if (eventResult.connectionError) {
      showMessage(
        'El producto fue registrado, pero no se pudo confirmar la trazabilidad en EPN Event Manager. Verifica que el servicio de eventos esté iniciado.',
        'error',
      );
    } else {
      showMessage(
        eventResult.visible
        ? 'Producto creado correctamente y agregado al inventario. La trazabilidad de Eventos fue actualizada.'
        : 'Producto creado correctamente y agregado al inventario. Consulta el historial de Eventos; si no aparece, verifica EVENT_HUB_URL.',
        eventResult.visible ? 'success' : 'error',
      );
    }
  } catch (error) {
    renderRequestError('Crear producto', `${API_URL}/products`, error);
    showMessage(getFunctionalErrorMessage(error, 'create'), 'error');
  } finally {
    loadingSpinner.classList.remove('active');
  }
});

productForm
  .querySelector('button[type="submit"]')
  .addEventListener('click', (event) => {
    if (!accessValidated) {
      event.preventDefault();
      requireApiKey();
    }
  });

async function loadProducts() {
  if (!apiKey || !accessValidated) {
    productList.innerHTML =
      '<div class="product-card empty">Valida el acceso para cargar productos.</div>';
    return;
  }

  try {
    loadingSpinner.classList.add('active');
    const { data } = await requestJson(`${API_URL}/products`, {
      protectedRequest: true,
    });
    loadedProducts = Array.isArray(data) ? data : [];
    updateCategoryOptions(loadedProducts);
    displayProducts(loadedProducts);
    dashboardTotalProducts.textContent = loadedProducts.length;
  } catch (error) {
    const functionalMessage = getFunctionalErrorMessage(error);
    productList.innerHTML = `
      <div class="product-card empty">
        ❌ ${escapeHtml(functionalMessage)}
      </div>
    `;
    showMessage(functionalMessage, 'error');
    return false;
  } finally {
    loadingSpinner.classList.remove('active');
  }
  return true;
}

function displayProducts(products) {
  const searchTerm = searchInput.value.toLowerCase();
  const filtered = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm),
  );

  if (filtered.length === 0) {
    productList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-text">
                    ${searchTerm ? 'No se encontraron productos' : 'No existen productos activos en el inventario.'}
        </div>
      </div>
    `;
    return;
  }

  productList.innerHTML = filtered
    .map(
      (product) => `
      <div class="product-card">
        <div class="product-header">
          <div class="product-title">${escapeHtml(product.name)}</div>
          <div class="product-card-badges">
            <span class="product-category">${escapeHtml(product.category)}</span>
            <span class="active-product-badge">Activo</span>
          </div>
        </div>
        ${
          product.description
            ? `<p class="product-description">${escapeHtml(product.description)}</p>`
            : ''
        }
        <div class="product-details">
          <div class="detail-item">
            <span class="detail-label">Cantidad</span>
            <span class="detail-value quantity">${product.quantity} unidades</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Precio Unitario</span>
            <span class="detail-value price">$${Number(product.price).toFixed(2)}</span>
          </div>
        </div>
        <div class="product-actions">
          <button class="btn btn-edit" onclick="openEditModal(${product.id}, ${escapeJson(product)})">
            ✏️ Editar
          </button>
          <button class="btn btn-danger" onclick="deleteProduct(${product.id}, ${escapeJson(product.name)})">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    `,
    )
    .join('');
}

function openEditModal(id, product) {
  editingId = id;
  document.getElementById('editId').value = id;
  document.getElementById('editName').value = product.name;
  document.getElementById('editCategory').value = product.category;
  document.getElementById('editQuantity').value = product.quantity;
  document.getElementById('editPrice').value = product.price;
  document.getElementById('editDescription').value = product.description || '';
  editModal.classList.add('active');
}

function closeEditModal() {
  editModal.classList.remove('active');
  editingId = null;
}

editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!requireApiKey()) return;

  const updates = {
    name: document.getElementById('editName').value,
    category: document.getElementById('editCategory').value,
    quantity: parseInt(document.getElementById('editQuantity').value, 10),
    price: parseFloat(document.getElementById('editPrice').value),
    description: document.getElementById('editDescription').value,
  };

  try {
    loadingSpinner.classList.add('active');
    await requestJson(`${API_URL}/products/${editingId}`, {
      method: 'PATCH',
      body: updates,
      protectedRequest: true,
    });
    showMessage('✅ Producto actualizado exitosamente');
    closeEditModal();
    await loadProducts();
  } catch (error) {
    showMessage(getFunctionalErrorMessage(error), 'error');
  } finally {
    loadingSpinner.classList.remove('active');
  }
});

function deleteProduct(id, name) {
  if (!requireApiKey()) return;

  pendingDeletion = { id, name };
  deleteModalMessage.textContent = `¿Deseas eliminar el producto "${name}" del inventario?`;
  deleteModal.classList.add('active');
  confirmDeleteBtn.focus();
}

function closeDeleteModal() {
  deleteModal.classList.remove('active');
  pendingDeletion = null;
}

async function confirmProductDeletion() {
  if (!pendingDeletion) return;
  if (!requireApiKey()) {
    closeDeleteModal();
    return;
  }

  const { id } = pendingDeletion;
  confirmDeleteBtn.disabled = true;

  try {
    loadingSpinner.classList.add('active');
    await requestJson(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      protectedRequest: true,
    });
    closeDeleteModal();
    showMessage('Producto eliminado correctamente del inventario activo.');
    await loadProducts();
  } catch (error) {
    closeDeleteModal();
    showMessage(getFunctionalErrorMessage(error), 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    loadingSpinner.classList.remove('active');
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeJson(object) {
  return JSON.stringify(object).replace(/"/g, '&quot;');
}

saveApiKeyBtn.addEventListener('click', () => void validateAccess());
clearApiKeyBtn.addEventListener('click', closeAccess);
apiKeyInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') void validateAccess();
});
document.querySelectorAll('[data-request]').forEach((button) => {
  button.addEventListener('click', () => void runDemoRequest(button.dataset.request));
});
document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => showView(button.dataset.view));
});
document.querySelectorAll('.product-tab').forEach((button) => {
  button.addEventListener('click', () =>
    showProductSubview(button.dataset.productView),
  );
});
document.querySelectorAll('.event-tab').forEach((button) => {
  button.addEventListener('click', () =>
    showEventSubview(button.dataset.eventView),
  );
});
goToInventoryBtn.addEventListener('click', () => showProductSubview('inventory'));
goToAccessBtn.addEventListener('click', () => {
  showView('dashboard');
  apiKeyInput.focus();
});
clearProductFiltersBtn.addEventListener('click', () => {
  document.getElementById('productNameFilter').value = '';
  document.getElementById('productCategoryFilter').value = '';
  searchResults.innerHTML =
    '<div class="empty-state"><div class="empty-state-text">Filtros limpiados. Selecciona Buscar para consultar todo el catálogo.</div></div>';
});
clearEventFiltersBtn.addEventListener('click', () => {
  clearEventFilterValues();
  eventFiltersSummary.textContent = 'Sin filtros aplicados.';
});
clearEventSearchBtn.addEventListener('click', clearEventSearch);
clearRecentEventsBtn.addEventListener('click', clearRecentEvents);
searchInput.addEventListener('input', () => displayProducts(loadedProducts));
refreshBtn.addEventListener('click', async () => {
  if (!requireApiKey()) return;
  const loaded = await loadProducts();
  if (loaded) showMessage('Inventario actualizado correctamente.');
});
[
  ['name', 'El nombre del producto es obligatorio.'],
  ['category', 'Selecciona una categoría para el producto.'],
  ['quantity', 'La cantidad debe ser un número válido.'],
  ['price', 'El precio debe ser un número válido.'],
].forEach(([id, validationMessage]) => {
  document.getElementById(id).addEventListener('invalid', () => {
    showMessage(validationMessage, 'error');
  });
});
closeBtn.addEventListener('click', closeEditModal);
cancelBtn.addEventListener('click', closeEditModal);
cancelDeleteBtn.addEventListener('click', closeDeleteModal);
confirmDeleteBtn.addEventListener('click', () => void confirmProductDeletion());
window.addEventListener('click', (event) => {
  if (event.target === editModal) closeEditModal();
  if (event.target === deleteModal) closeDeleteModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && deleteModal.classList.contains('active')) {
    closeDeleteModal();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
  apiKey = '';
  accessValidated = false;
  updateApiKeyStatus();
  resetOperationalData();
  showView('dashboard');
  void checkStatus();
  setInterval(() => void checkStatus(), 10000);
});
