document.addEventListener('DOMContentLoaded', () => {
    // --- CSS for Drag & Drop Visual Feedback ---
    const style = document.createElement('style');
    style.textContent = `
        .dragging {
            opacity: 0.4;
        }
        .drag-over-top {
            border-top: 1px solid #ccc;
        }
        .drag-over-bottom {
            border-bottom: 1px solid #ccc;
        }
        /* 테이블 행에 대한 스타일 */
        tr.drag-over-top > td {
            box-shadow: inset 0 1px 0 0 #ccc;
        }
        tr.drag-over-bottom > td {
            box-shadow: inset 0 -1px 0 0 #ccc;
        }
    `;
    document.head.append(style);

    // --- DOM Elements ---
    const DOMElements = {
        subjectListTableBody: document.getElementById('subject-list'),
        addSubjectBtn: document.getElementById('add-subject-btn'),
        addCategoryBtn: document.getElementById('add-category-btn'),
        categoryContainer: document.getElementById('category-container'),
        leftPanel: document.getElementById('left-panel'),
        currentTotalCreditsSpan: document.getElementById('current-total-credits'),
        requiredTotalCreditsSpan: document.getElementById('required-total-credits'),
        gpaDisplaySpan: document.getElementById('gpa-display'),
        requiredGPASpan: document.getElementById('required-gpa'),
        excelUploadBtn: document.getElementById('excel-upload-btn'),
        excelFileInput: document.getElementById('excel-file-input'),
    };

    // --- Data Management ---
    let state = {
        subjects: {}, categories: {}, nextSubjectId: 1, nextCategoryId: 1,
        requiredTotalCredits: 130, requiredGPA: 2.0,
    };

    const gradePointsMap = {
        'A+': 4.5, 'A0': 4.0, 'B+': 3.5, 'B0': 3.0, 'C+': 2.5, 'C0': 2.0,
        'D+': 1.5, 'D0': 1.0, 'F': 0.0, 'P': 0.0, 'NP': 0.0,
    };

    // --- Utility & Data Persistence ---
    const saveData = () => localStorage.setItem('gradeManagerData', JSON.stringify(state));
    const loadData = () => {
        const savedData = localStorage.getItem('gradeManagerData');
        if (savedData) state = JSON.parse(savedData);
    };

    // --- Calculation Functions ---
    const calculateTotalCredits = () => Object.values(state.subjects).reduce((total, { credits, grade }) =>
        grade !== 'NP' && !isNaN(parseFloat(credits)) ? total + parseFloat(credits) : total, 0);

    const calculateGPA = () => {
        let totalGradePoints = 0, totalCreditsForGPA = 0;
        Object.values(state.subjects).forEach(subject => {
            const credits = parseFloat(subject.credits);
            if (subject.grade !== 'NP' && subject.grade !== 'P' && !isNaN(credits) && credits > 0) {
                totalGradePoints += (gradePointsMap[subject.grade] || 0) * credits;
                totalCreditsForGPA += credits;
            }
        });
        return totalCreditsForGPA === 0 ? 0.00 : (totalGradePoints / totalCreditsForGPA);
    };

    // --- Rendering Engine ---
    const render = () => {
        renderSubjects();
        renderCategories();
        updateOverallDisplay();
        saveData();
    };

    const renderSubjects = () => {
        DOMElements.subjectListTableBody.innerHTML = Object.keys(state.subjects).map(id => {
            const subject = state.subjects[id];
            const gradeOptions = Object.keys(gradePointsMap).map(grade =>
                `<option value="${grade}" ${subject.grade === grade ? 'selected' : ''}>${grade}</option>`
            ).join('');
            return `
                <tr data-subject-id="${id}" draggable="true">
                    <td contenteditable="true" spellcheck="false">${subject.name}</td>
                    <td contenteditable="true" spellcheck="false">${subject.credits}</td>
                    <td><select class="grade-select"><option value=""></option>${gradeOptions}</select></td>
                    <td class="actions-cell"><span class="remove-main-subject-btn">×</span></td>
                </tr>`;
        }).join('');
    };

    const renderCategories = () => {
        DOMElements.categoryContainer.innerHTML = Object.keys(state.categories).map(id => {
            const category = state.categories[id];
            let currentCredits = 0;
            const subjectItemsHTML = category.subjects.map(subjectId => {
                const subject = state.subjects[subjectId];
                if (!subject) return '';
                if (subject.grade !== 'NP' && !isNaN(parseFloat(subject.credits))) currentCredits += parseFloat(subject.credits);
                return `
                    <div class="subject-item" data-subject-id="${subjectId}" data-from-category="${id}" draggable="true">
                        <span>${subject.name} (${subject.credits}학점, ${subject.grade})</span>
                        <span class="remove-subject-btn">×</span>
                    </div>`;
            }).join('');
            const requiredCreditsMet = currentCredits >= category.requiredCredits;
            return `
                <div class="category-box" data-category-id="${id}">
                    <span class="remove-category-btn">×</span>
                    <div class="category-header">
                        <span class="category-name" contenteditable="true" spellcheck="false">${category.name}</span>
                        <span class="credits-info">
                            (<span class="current-credits ${requiredCreditsMet ? 'sufficient' : 'insufficient'}">${currentCredits}</span> /
                            <span class="required-credits" contenteditable="true" spellcheck="false">${category.requiredCredits}</span> 학점)
                        </span>
                    </div>
                    ${subjectItemsHTML}
                </div>`;
        }).join('');
    };

    const updateOverallDisplay = () => {
        const currentCredits = calculateTotalCredits(), currentGPA = calculateGPA();
        Object.assign(DOMElements.currentTotalCreditsSpan, { textContent: currentCredits, className: currentCredits >= state.requiredTotalCredits ? 'sufficient' : 'insufficient' });
        DOMElements.requiredTotalCreditsSpan.textContent = state.requiredTotalCredits;
        Object.assign(DOMElements.gpaDisplaySpan, { textContent: currentGPA.toFixed(2), className: currentGPA >= state.requiredGPA ? 'sufficient' : 'insufficient' });
        DOMElements.requiredGPASpan.textContent = state.requiredGPA.toFixed(2);
    };

    // --- Action Handlers ---
    const addSubject = (data = { name: '', credits: '', grade: '' }) => {
        const id = `sub-${state.nextSubjectId++}`;
        state.subjects[id] = data;
        render();
        const newRow = DOMElements.subjectListTableBody.querySelector(`[data-subject-id="${id}"]`);
        if(newRow) newRow.cells[0].focus();
    };
    
    const removeSubject = (subjectId) => {
        delete state.subjects[subjectId];
        Object.values(state.categories).forEach(cat => { cat.subjects = cat.subjects.filter(id => id !== subjectId); });
        render();
    };

    const addCategory = () => {
        const id = `cat-${state.nextCategoryId++}`;
        state.categories[id] = { name: '새 카테고리', requiredCredits: 15, subjects: [] };
        render();
    };

    const removeCategory = (categoryId) => {
        delete state.categories[categoryId];
        render();
    };
    
    const removeSubjectFromCategory = (subjectId, categoryId) => {
        if (state.categories[categoryId]) {
            state.categories[categoryId].subjects = state.categories[categoryId].subjects.filter(id => id !== subjectId);
            render();
        }
    };
    
    // --- Event Listeners (Delegated) ---
    DOMElements.subjectListTableBody.addEventListener('click', e => {
        if (e.target.matches('.remove-main-subject-btn')) removeSubject(e.target.closest('tr').dataset.subjectId);
    });

    DOMElements.subjectListTableBody.addEventListener('change', e => {
        if (e.target.matches('.grade-select')) {
            state.subjects[e.target.closest('tr').dataset.subjectId].grade = e.target.value;
            render();
        }
    });

    DOMElements.subjectListTableBody.addEventListener('blur', e => {
        if (e.target.matches('[contenteditable]')) {
            const { subjectId } = e.target.closest('tr').dataset;
            const field = e.target.cellIndex === 0 ? 'name' : 'credits';
            const value = e.target.textContent.trim();
            state.subjects[subjectId][field] = field === 'credits' && isNaN(parseFloat(value)) ? '' : value;
            render();
        }
    }, true);
    
    DOMElements.categoryContainer.addEventListener('click', e => {
        const categoryBox = e.target.closest('.category-box');
        if (!categoryBox) return;
        if (e.target.matches('.remove-category-btn')) removeCategory(categoryBox.dataset.categoryId);
        if (e.target.matches('.remove-subject-btn')) removeSubjectFromCategory(e.target.closest('.subject-item').dataset.subjectId, categoryBox.dataset.categoryId);
    });

    DOMElements.categoryContainer.addEventListener('blur', e => {
        if (e.target.matches('[contenteditable]')) {
            const { categoryId } = e.target.closest('.category-box').dataset;
            const value = e.target.textContent.trim();
            if (e.target.matches('.category-name')) state.categories[categoryId].name = value;
            else if (e.target.matches('.required-credits')) state.categories[categoryId].requiredCredits = isNaN(parseInt(value, 10)) ? state.categories[categoryId].requiredCredits : parseInt(value, 10);
            render();
        }
    }, true);

    // --- Drag and Drop Handlers ---
    let draggedElement = null;

    document.addEventListener('dragstart', e => {
        if (e.target.matches('[draggable="true"]')) {
            draggedElement = e.target;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', e.target.dataset.subjectId);
            if (e.target.dataset.fromCategory) e.dataTransfer.setData('from-category', e.target.dataset.fromCategory);
            setTimeout(() => draggedElement.classList.add('dragging'), 0);
        }
    });

    let lastDragOverTarget = null;
    document.addEventListener('dragover', e => {
        e.preventDefault();
        const target = e.target.closest('.subject-item, tr[data-subject-id]');
        if (lastDragOverTarget && lastDragOverTarget !== target) {
            lastDragOverTarget.classList.remove('drag-over-top', 'drag-over-bottom');
        }
        if (target && target !== draggedElement) {
            const rect = target.getBoundingClientRect();
            const isTopHalf = e.clientY < rect.top + rect.height / 2;
            target.classList.toggle('drag-over-top', isTopHalf);
            target.classList.toggle('drag-over-bottom', !isTopHalf);
            lastDragOverTarget = target;
        }
    });
    
    document.addEventListener('dragleave', e => {
        const target = e.target.closest('.subject-item, tr[data-subject-id]');
        if(target) target.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    document.addEventListener('drop', e => {
        e.preventDefault();
        if (!draggedElement) return;

        const subjectId = e.dataTransfer.getData('text/plain');
        if (!subjectId) return;

        const fromCategoryId = e.dataTransfer.getData('from-category');
        const targetElement = e.target.closest('.subject-item, .category-box, tr[data-subject-id]');

        // Reordering within main subject list
        if (draggedElement.matches('tr') && targetElement && targetElement.matches('tr')) {
            const targetId = targetElement.dataset.subjectId;
            if (subjectId !== targetId) {
                const currentIds = Object.keys(state.subjects);
                currentIds.splice(currentIds.indexOf(subjectId), 1);
                const targetIndex = currentIds.indexOf(targetId);
                const rect = targetElement.getBoundingClientRect();
                const insertBefore = e.clientY < rect.top + rect.height / 2;
                currentIds.splice(insertBefore ? targetIndex : targetIndex + 1, 0, subjectId);
                
                const newSubjectsOrder = {};
                currentIds.forEach(id => { newSubjectsOrder[id] = state.subjects[id]; });
                state.subjects = newSubjectsOrder;
                render();
            }
            return;
        }

        // Reordering within the same category
        if (draggedElement.matches('.subject-item') && targetElement && targetElement.matches('.subject-item')) {
            const toCategoryId = targetElement.closest('.category-box').dataset.categoryId;
            if (fromCategoryId === toCategoryId) {
                const subjectIds = state.categories[fromCategoryId].subjects;
                const targetId = targetElement.dataset.subjectId;
                subjectIds.splice(subjectIds.indexOf(subjectId), 1);
                const targetIndex = subjectIds.indexOf(targetId);
                const rect = targetElement.getBoundingClientRect();
                const insertBefore = e.clientY < rect.top + rect.height / 2;
                subjectIds.splice(insertBefore ? targetIndex : targetIndex + 1, 0, subjectId);
                render();
                return;
            }
        }

        // Dropping into a category
        const targetCategoryBox = e.target.closest('.category-box');
        if (targetCategoryBox) {
            const toCategoryId = targetCategoryBox.dataset.categoryId;
            if (fromCategoryId && fromCategoryId !== toCategoryId) {
                state.categories[fromCategoryId].subjects = state.categories[fromCategoryId].subjects.filter(id => id !== subjectId);
            }
            if (!state.categories[toCategoryId].subjects.includes(subjectId)) {
                const subjectIds = state.categories[toCategoryId].subjects;
                const targetSubject = e.target.closest('.subject-item');
                if(targetSubject){ // drop onto a subject inside the category
                    const targetId = targetSubject.dataset.subjectId;
                    const targetIndex = subjectIds.indexOf(targetId);
                    const rect = targetSubject.getBoundingClientRect();
                    const insertBefore = e.clientY < rect.top + rect.height / 2;
                    subjectIds.splice(insertBefore ? targetIndex : targetIndex + 1, 0, subjectId);
                } else { // drop onto the category box itself
                    subjectIds.push(subjectId);
                }
            }
            render();
            return;
        }

        // Dropping outside a category to remove
        if (fromCategoryId && !targetCategoryBox) {
            removeSubjectFromCategory(subjectId, fromCategoryId);
        }
    });

    document.addEventListener('dragend', () => {
        if(draggedElement) draggedElement.classList.remove('dragging');
        if(lastDragOverTarget) lastDragOverTarget.classList.remove('drag-over-top', 'drag-over-bottom');
        draggedElement = null;
        lastDragOverTarget = null;
    });

    // --- Global Settings & Excel Processing ---
    [DOMElements.requiredTotalCreditsSpan, DOMElements.requiredGPASpan].forEach(el => {
        el.setAttribute('contenteditable', 'true');
        el.addEventListener('blur', () => {
            const value = el.textContent.trim();
            if (el.id === 'required-total-credits') state.requiredTotalCredits = isNaN(parseInt(value, 10)) ? state.requiredTotalCredits : parseInt(value, 10);
            else if (el.id === 'required-gpa') state.requiredGPA = isNaN(parseFloat(value)) ? state.requiredGPA : parseFloat(value);
            render();
        });
    });

    DOMElements.excelUploadBtn.addEventListener('click', () => DOMElements.excelFileInput.click());
    DOMElements.excelFileInput.addEventListener('change', event => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                const initialIds = Object.keys(state.subjects);
                if (initialIds.length === 1 && Object.values(state.subjects[initialIds[0]]).every(val => val === '')) {
                    delete state.subjects[initialIds[0]];
                }
                jsonData.forEach(row => {
                    if (row['교과목명'] && row['학점'] !== undefined && row['등급'] !== undefined) {
                        const id = `sub-${state.nextSubjectId++}`;
                        state.subjects[id] = { name: String(row['교과목명']), credits: String(row['학점']), grade: String(row['등급']).toUpperCase().trim() };
                    }
                });
                render();
            } catch (error) {
                console.error("Error processing Excel file:", error);
                alert("엑셀 파일을 처리하는 중 오류가 발생했습니다. 파일이 암호화되어 있는지 확인해주세요.");
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    });
    
    // --- Initialization ---
    DOMElements.addSubjectBtn.addEventListener('click', () => addSubject());
    DOMElements.addCategoryBtn.addEventListener('click', addCategory);

    loadData();
    if (Object.keys(state.subjects).length === 0) {
        addSubject();
    } else {
        render();
    }
});