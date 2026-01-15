// PyToYa Audit Dashboard - Standalone JavaScript

// State
let state = {
    tasks: [],
    filteredTasks: [],
    currentTaskIndex: 0
};

// DOM Elements
const elements = {
    filterSelect: document.getElementById('filterSelect'),
    sortSelect: document.getElementById('sortSelect'),
    taskList: document.getElementById('taskList'),
    taskCounter: document.getElementById('taskCounter'),
    loadingState: document.getElementById('loadingState'),
    noTasksState: document.getElementById('noTasksState'),
    mainContent: document.getElementById('mainContent'),
    taskTitle: document.getElementById('taskTitle'),
    taskStatus: document.getElementById('taskStatus'),
    confidenceBadge: document.getElementById('confidenceBadge'),
    taskPath: document.getElementById('taskPath'),
    pdfViewer: document.getElementById('pdfViewer'),
    extractionAlert: document.getElementById('extractionAlert'),
    extractionIssues: document.getElementById('extractionIssues'),
    itemsContainer: document.getElementById('itemsContainer'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    toastIcon: document.getElementById('toastIcon')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadTasks();
});

// Setup event listeners
function setupEventListeners() {
    elements.filterSelect.addEventListener('change', applyFilters);
    elements.sortSelect.addEventListener('change', sortTasks);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;

        switch(e.key) {
            case 'ArrowLeft':
                previousTask();
                break;
            case 'ArrowRight':
                nextTask();
                break;
            case 's':
            case 'S':
                if (e.ctrlKey || e.metaKey) return;
                saveChanges();
                break;
        }
    });
}

// Load tasks from selected folder
async function loadTasks() {
    showLoading(true);

    try {
        const response = await fetch('/api/tasks');
        state.tasks = await response.json();

        if (state.tasks.length === 0) {
            showEmptyState();
            showLoading(false);
            return;
        }

        applyFilters();
    } catch (error) {
        showToast('Error loading tasks: ' + error.message, 'error');
        showEmptyState();
    }

    showLoading(false);
}

// Apply filters
function applyFilters() {
    const filter = elements.filterSelect.value;
    state.filteredTasks = state.tasks.filter(task => {
        if (filter === 'unchecked') return !task.data?.human_checked;
        if (filter === 'checked') return task.data?.human_checked;
        return true;
    });

    sortTasks();
}

// Sort tasks
function sortTasks() {
    const sortBy = elements.sortSelect.value;

    state.filteredTasks.sort((a, b) => {
        const aPo = String(a.data?.invoice?.po_no || '');
        const bPo = String(b.data?.invoice?.po_no || '');
        const aDate = String(a.data?.invoice?.invoice_date || '');
        const bDate = String(b.data?.invoice?.invoice_date || '');

        switch (sortBy) {
            case 'po':
                return aPo.localeCompare(bPo);
            case 'date':
                return aDate.localeCompare(bDate);
            case 'status':
                return (a.status === 'success' ? -1 : 1) - (b.status === 'success' ? -1 : 1);
            case 'path':
            default:
                return a.path.localeCompare(b.path);
        }
    });

    renderTaskList();
    if (state.filteredTasks.length > 0) {
        state.currentTaskIndex = 0;
        showMainContent(true);
        loadCurrentTask();
    } else {
        showEmptyState();
    }
}

// Render task list
function renderTaskList() {
    elements.taskList.innerHTML = '';

    // Group tasks by folder
    const groupedTasks = {};
    state.filteredTasks.forEach(task => {
        if (!groupedTasks[task.folder]) {
            groupedTasks[task.folder] = [];
        }
        groupedTasks[task.folder].push(task);
    });

    Object.entries(groupedTasks).forEach(([folder, tasks]) => {
        // Folder header
        const folderHeader = document.createElement('div');
        folderHeader.className = 'px-4 py-2 bg-gray-100 font-medium text-sm text-gray-700 border-b sticky top-0';
        folderHeader.textContent = folder;
        elements.taskList.appendChild(folderHeader);

        // Tasks in this folder
        tasks.forEach((task) => {
            const globalIndex = state.filteredTasks.indexOf(task);
            const div = document.createElement('div');
            div.className = `p-3 cursor-pointer hover:bg-gray-50 ${globalIndex === state.currentTaskIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`;
            div.onclick = () => {
                state.currentTaskIndex = globalIndex;
                renderTaskList();
                loadCurrentTask();
            };

            const isChecked = task.data?.human_checked;
            const confidence = task.data?._extraction_info?.confidence || 0;
            const po = task.data?.invoice?.po_no || 'N/A';
            const date = task.data?.invoice?.invoice_date || 'N/A';

            div.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-medium text-gray-800 truncate">${task.name}</span>
                    <div class="flex items-center gap-1">
                        ${isChecked ? '<i class="fas fa-check-circle text-green-500 text-xs"></i>' : ''}
                        <span class="text-xs text-gray-400">${Math.round(confidence * 100)}%</span>
                    </div>
                </div>
                <div class="text-xs text-gray-500 mt-1">PO: ${po} | ${date}</div>
            `;

            elements.taskList.appendChild(div);
        });
    });

    elements.taskCounter.textContent = `${state.currentTaskIndex + 1} / ${state.filteredTasks.length}`;
}

// Load current task
async function loadCurrentTask() {
    const task = state.filteredTasks[state.currentTaskIndex];
    if (!task) return;

    const data = task.data;
    if (!data) return;

    console.log('Loading task:', task.name, 'pdfPath:', task.pdfPath);
    console.log('Elements:', {
        taskTitle: !!elements.taskTitle,
        taskStatus: !!elements.taskStatus,
        pdfViewer: !!elements.pdfViewer,
        departmentCode: !!document.getElementById('department_code')
    });
    console.log('Task data:', data);

    // Update header
    if (elements.taskTitle) elements.taskTitle.textContent = task.name;
    if (elements.taskPath) elements.taskPath.textContent = task.path;
    console.log('Title set to:', elements.taskTitle.textContent);

    // Status badge
    elements.taskStatus.textContent = data.human_checked ? 'Verified' : 'Pending';
    elements.taskStatus.className = `px-2 py-0.5 text-xs rounded-full ${data.human_checked ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`;

    // Confidence badge
    const confidence = data._extraction_info?.confidence || 0;
    const confidencePercent = Math.round(confidence * 100);
    let confidenceClass = 'bg-red-100 text-red-700';
    if (confidence >= 0.9) confidenceClass = 'bg-green-100 text-green-700';
    else if (confidence >= 0.7) confidenceClass = 'bg-yellow-100 text-yellow-700';

    elements.confidenceBadge.className = `flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${confidenceClass}`;
    elements.confidenceBadge.innerHTML = `<i class="fas fa-chart-line"></i> ${confidencePercent}%`;

    // PDF
    elements.pdfViewer.src = task.pdfPath;
    console.log('PDF src set to:', elements.pdfViewer.src);

    // Extraction info
    const issues = data._extraction_info?.ocr_issues || [];
    const uncertainFields = data._extraction_info?.uncertain_fields || [];

    if (issues.length > 0 || uncertainFields.length > 0) {
        elements.extractionAlert.classList.remove('hidden');
        elements.extractionIssues.innerHTML = [
            ...issues.map(i => `<li>${i}</li>`),
            ...uncertainFields.map(f => `<li>Uncertain: ${f}</li>`)
        ].join('');
    } else {
        elements.extractionAlert.classList.add('hidden');
    }

    // Form fields
    document.getElementById('department_code').value = data.department?.code || '';
    document.getElementById('invoice_po_no').value = data.invoice?.po_no || '';
    document.getElementById('invoice_date').value = data.invoice?.invoice_date || '';
    document.getElementById('human_checked').checked = data.human_checked || false;

    // Items
    renderItems(data.items || []);
}

// Render items
function renderItems(items) {
    elements.itemsContainer.innerHTML = '';

    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'border rounded p-2 space-y-2 text-sm';

        div.innerHTML = `
            <div class="flex justify-end">
                <button onclick="deleteItem(this)" class="text-red-500 hover:text-red-700 text-xs" title="Delete item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div class="col-span-2">
                    <label class="text-xs text-gray-500">Name</label>
                    <input type="text" class="item-name field-editable w-full border rounded px-2 py-1" value="${item.name || ''}">
                </div>
                <div>
                    <label class="text-xs text-gray-500">Quantity</label>
                    <input type="number" step="0.01" class="item-qty field-editable w-full border rounded px-2 py-1" value="${item.quantity || ''}">
                </div>
                <div>
                    <label class="text-xs text-gray-500">Unit</label>
                    <input type="text" class="item-unit field-editable w-full border rounded px-2 py-1" value="${item.unit || ''}">
                </div>
                <div>
                    <label class="text-xs text-gray-500">Unit Price (Ex Tax)</label>
                    <input type="number" step="0.01" class="item-price-ex field-editable w-full border rounded px-2 py-1" value="${item.unit_price_ex_tax || ''}">
                </div>
                <div>
                    <label class="text-xs text-gray-500">Unit Price (Inc Tax)</label>
                    <input type="number" step="0.01" class="item-price-inc field-editable w-full border rounded px-2 py-1" value="${item.unit_price_inc_tax || ''}">
                </div>
                <div class="col-span-2">
                    <label class="text-xs text-gray-500">Total (Inc Tax)</label>
                    <input type="number" step="0.01" class="item-total field-editable w-full border rounded px-2 py-1" value="${item.total_amount_inc_tax || ''}">
                </div>
            </div>
        `;

        elements.itemsContainer.appendChild(div);
    });
}

// Toggle edit mode
function toggleEditMode() {
    // Fields are now always editable
    const checkbox = document.getElementById('human_checked');
    checkbox.disabled = false;
}

// Navigation
function previousTask() {
    if (state.currentTaskIndex > 0) {
        state.currentTaskIndex--;
        renderTaskList();
        loadCurrentTask();
    }
}

function nextTask() {
    if (state.currentTaskIndex < state.filteredTasks.length - 1) {
        state.currentTaskIndex++;
        renderTaskList();
        loadCurrentTask();
    }
}

// Actions
async function saveChanges() {
    const task = state.filteredTasks[state.currentTaskIndex];
    if (!task || !task.data) return;

    // Collect form data
    task.data.department = { code: document.getElementById('department_code').value };
    task.data.invoice = {
        po_no: document.getElementById('invoice_po_no').value,
        invoice_date: document.getElementById('invoice_date').value
    };
    task.data.human_checked = document.getElementById('human_checked').checked;

    // Collect items
    const items = [];
    const itemElements = elements.itemsContainer.children;
    for (const el of itemElements) {
        items.push({
            name: el.querySelector('.item-name').value,
            quantity: parseFloat(el.querySelector('.item-qty').value) || 0,
            unit: el.querySelector('.item-unit').value,
            unit_price_ex_tax: parseFloat(el.querySelector('.item-price-ex').value) || 0,
            unit_price_inc_tax: parseFloat(el.querySelector('.item-price-inc').value) || 0,
            total_amount_inc_tax: parseFloat(el.querySelector('.item-total').value) || 0
        });
    }
    task.data.items = items;

    // Save via API
    const response = await fetch(`/api/task/${task.path}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task.data)
    });
    const result = await response.json();
    if (result.success) {
        showToast('Changes saved!', 'success');
        renderTaskList();
    } else {
        showToast('Failed to save', 'error');
    }
}

function approveTask() {
    document.getElementById('human_checked').checked = true;
    saveChanges();

    // Auto-advance to next unchecked task
    const nextUnchecked = state.filteredTasks.findIndex((t, i) => i > state.currentTaskIndex && !t.data?.human_checked);
    if (nextUnchecked !== -1) {
        state.currentTaskIndex = nextUnchecked;
        renderTaskList();
        loadCurrentTask();
    }
}

function addItem() {
    const div = document.createElement('div');
    div.className = 'border rounded p-2 space-y-2 text-sm bg-blue-50';
    div.innerHTML = `
        <div class="flex justify-end">
            <button onclick="deleteItem(this)" class="text-red-500 hover:text-red-700 text-xs" title="Delete item">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="grid grid-cols-2 gap-2">
            <div class="col-span-2">
                <label class="text-xs text-gray-500">Name</label>
                <input type="text" class="item-name field-editable w-full border rounded px-2 py-1" placeholder="Item name">
            </div>
            <div>
                <label class="text-xs text-gray-500">Quantity</label>
                <input type="number" step="0.01" class="item-qty field-editable w-full border rounded px-2 py-1" placeholder="Qty">
            </div>
            <div>
                <label class="text-xs text-gray-500">Unit</label>
                <input type="text" class="item-unit field-editable w-full border rounded px-2 py-1" placeholder="Unit">
            </div>
            <div>
                <label class="text-xs text-gray-500">Unit Price (Ex Tax)</label>
                <input type="number" step="0.01" class="item-price-ex field-editable w-full border rounded px-2 py-1" placeholder="Price ex">
            </div>
            <div>
                <label class="text-xs text-gray-500">Unit Price (Inc Tax)</label>
                <input type="number" step="0.01" class="item-price-inc field-editable w-full border rounded px-2 py-1" placeholder="Price inc">
            </div>
            <div class="col-span-2">
                <label class="text-xs text-gray-500">Total (Inc Tax)</label>
                <input type="number" step="0.01" class="item-total field-editable w-full border rounded px-2 py-1" placeholder="Total">
            </div>
        </div>
    `;
    elements.itemsContainer.appendChild(div);
}

function deleteItem(button) {
    button.closest('.border').remove();
}

function reExtract() {
    showToast('Re-extraction requires backend API', 'info');
}

function zoomIn() {
    state.pdfZoom = Math.min(state.pdfZoom + 0.25, 3);
    updatePdfZoom();
}

function zoomOut() {
    state.pdfZoom = Math.max(state.pdfZoom - 0.25, 0.5);
    updatePdfZoom();
}

function updatePdfZoom() {
    elements.pdfViewer.style.transform = `scale(${state.pdfZoom})`;
}

function openPdfNewTab() {
    const task = state.filteredTasks[state.currentTaskIndex];
    if (task?.pdfPath) {
        window.open(task.pdfPath, '_blank');
    }
}

function printView() {
    window.print();
}

// UI State helpers
function showLoading(show) {
    if (show) {
        elements.loadingState.classList.remove('is-hidden');
        elements.loadingState.classList.add('is-visible');
    } else {
        elements.loadingState.classList.remove('is-visible');
        elements.loadingState.classList.add('is-hidden');
    }
    elements.noTasksState.classList.add('is-hidden');
    elements.noTasksState.classList.remove('is-visible');
    elements.mainContent.classList.add('is-hidden');
    elements.mainContent.classList.remove('is-visible');
}

function showEmptyState() {
    showMainContent(true);
    // Clear task details
    if (elements.taskTitle) elements.taskTitle.textContent = '';
    if (elements.taskPath) elements.taskPath.textContent = '';
    if (elements.pdfViewer) elements.pdfViewer.src = '';
    if (elements.itemsContainer) elements.itemsContainer.innerHTML = '';
    // Show empty message in task list
    if (elements.taskList) {
        elements.taskList.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No tasks match the current filter. Try changing the filter above.</div>';
    }
    if (elements.taskCounter) elements.taskCounter.textContent = '0 / 0';
}

function showMainContent(show) {
    if (show) {
        elements.mainContent.classList.remove('is-hidden');
        elements.mainContent.classList.add('is-visible');
        elements.mainContent.style.display = 'block';
        elements.mainContent.style.minHeight = '';
        // Ensure class removal takes effect
        setTimeout(() => {
            elements.mainContent.classList.remove('is-hidden');
        }, 0);
    } else {
        elements.mainContent.classList.remove('is-visible');
        elements.mainContent.classList.add('is-hidden');
    }
    elements.loadingState.classList.add('is-hidden');
    elements.loadingState.classList.remove('is-visible');
    elements.noTasksState.classList.add('is-hidden');
    elements.noTasksState.classList.remove('is-visible');
}

function showToast(message, type = 'info') {
    elements.toastMessage.textContent = message;

    const icons = {
        success: 'fa-check-circle text-green-400',
        error: 'fa-exclamation-circle text-red-400',
        info: 'fa-info-circle text-blue-400',
        warning: 'fa-exclamation-triangle text-yellow-400'
    };

    elements.toastIcon.className = `fas ${icons[type] || icons.info}`;

    elements.toast.classList.remove('translate-y-full', 'opacity-0');

    setTimeout(() => {
        elements.toast.classList.add('translate-y-full', 'opacity-0');
    }, 3000);
}

// Keyboard shortcuts help
console.log(`
PyToYa Audit Dashboard - Keyboard Shortcuts:
--------------------------------------------
← / →     Previous / Next task
S         Save changes
`);
