document.addEventListener('DOMContentLoaded', () => {
    // --- 상수 및 상태 정의 ---
    const GRADE_POINTS_MAP = { 'A+': 4.5, 'A0': 4.0, 'B+': 3.5, 'B0': 3.0, 'C+': 2.5, 'C0': 2.0, 'D+': 1.5, 'D0': 1.0, 'F': 0.0, 'P': 0.0, 'NP': 0.0 };
    const LOCAL_STORAGE_KEY = 'gradeManagerData';
    let state = {
        subjects: {},
        categories: {},
        requiredSubjects: {}, // 필수 과목 목록 추가
        nextSubjectId: 1,
        nextCategoryId: 1,
        nextRequiredSubjectId: 1, // 필수 과목 ID 추가
        requiredTotalCredits: 130,
        requiredGPA: 2.0
    };

    // --- DOM 요소 캐싱 ---
    const DOMElements = {
        subjectListBody: document.getElementById('subject-list'),
        requiredSubjectListBody: document.getElementById('required-subject-list'), // 필수 과목 테이블 body 추가
        categoryContainer: document.getElementById('category-container'),
        currentTotalCreditsSpan: document.getElementById('current-total-credits'),
        requiredTotalCreditsSpan: document.getElementById('required-total-credits'),
        gpaDisplaySpan: document.getElementById('gpa-display'),
        requiredGPASpan: document.getElementById('required-gpa'),
        excelFileInput: document.getElementById('excel-file-input'),
    };

    // --- 데이터 영속성 ---
    const saveState = () => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    const loadState = () => {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            // 이전 버전 데이터와의 호환성을 위해 requiredSubjects가 없으면 초기화
            if (!parsedData.requiredSubjects) {
                parsedData.requiredSubjects = {};
                parsedData.nextRequiredSubjectId = 1;
            }
            state = parsedData;
        }
    };

    // --- 계산 함수 ---
    const calculateTotalCredits = () => Object.values(state.subjects).reduce((total, { credits, grade }) => (grade !== 'NP' ? total + (parseFloat(credits) || 0) : total), 0);
    const calculateGPA = () => {
        const { totalPoints, gpaCredits } = Object.values(state.subjects).reduce(({ totalPoints, gpaCredits }, { credits, grade }) => {
            const cred = parseFloat(credits);
            if (grade && grade !== 'P' && grade !== 'NP' && !isNaN(cred) && cred > 0) {
                totalPoints += (GRADE_POINTS_MAP[grade] || 0) * cred;
                gpaCredits += cred;
            }
            return { totalPoints, gpaCredits };
        }, { totalPoints: 0, gpaCredits: 0 });
        return gpaCredits === 0 ? 0.00 : totalPoints / gpaCredits;
    };

    // --- 렌더링 및 UI 업데이트 ---
    const render = () => {
        const activeElementId = document.activeElement?.id;
        const activeElementContent = document.activeElement?.textContent;

        renderSubjects();
        renderCategories();
        renderRequiredSubjects(); // 필수 과목 렌더링 호출
        updateCalculatedDisplays();

        if (activeElementId) {
            const newActiveElement = document.getElementById(activeElementId);
            if (newActiveElement && newActiveElement.textContent === activeElementContent) {
                newActiveElement.focus();
            }
        }
    };

    const updateCalculatedDisplays = () => { // 값만 변경될 때 호출
        updateOverallDisplay();
        updateAllCategoryCredits();
        saveState();
    };

    const updateSubjectDisplays = (subjectId) => {
        const subject = state.subjects[subjectId];
        if (!subject) return;

        // 1. 카테고리 내의 과목 정보 텍스트 업데이트
        document.querySelectorAll(`.subject-item[data-subject-id="${subjectId}"]`).forEach(item => {
            const span = item.querySelector('span:first-child');
            if (span) span.textContent = `${subject.name} (${subject.credits}학점, ${subject.grade})`;
        });
        
        // 2. 필수 과목 목록의 상태(색상) 업데이트
        renderRequiredSubjects();

        // 3. 계산된 모든 값들 업데이트
        updateCalculatedDisplays();
    };

    const renderSubjects = () => {
        DOMElements.subjectListBody.innerHTML = Object.entries(state.subjects).map(([id, subject]) => `
            <tr data-subject-id="${id}" draggable="true">
                <td contenteditable="true" spellcheck="false">${subject.name}</td>
                <td contenteditable="true" spellcheck="false">${subject.credits}</td>
                <td><select class="grade-select"><option value=""></option>${createGradeOptionsHTML(subject.grade)}</select></td>
                <td class="actions-cell"><span class="remove-main-subject-btn">×</span></td>
            </tr>`).join('');
    };

    const renderRequiredSubjects = () => {
        const mainSubjectNames = Object.values(state.subjects).map(s => s.name.trim());
        DOMElements.requiredSubjectListBody.innerHTML = Object.entries(state.requiredSubjects).map(([id, subject]) => {
            const isCompleted = mainSubjectNames.includes(subject.name.trim());
            const statusClass = subject.name.trim() ? (isCompleted ? 'sufficient-req' : 'insufficient-req') : '';
            return `
                <tr data-req-subject-id="${id}">
                    <td contenteditable="true" spellcheck="false" class="${statusClass}">${subject.name}</td>
                    <td class="actions-cell"><span class="remove-required-subject-btn">×</span></td>
                </tr>`;
        }).join('');
    };

    const renderCategories = () => {
        DOMElements.categoryContainer.innerHTML = Object.entries(state.categories).map(([id, category]) => {
            const subjectItemsHTML = category.subjects.map(subjectId => {
                const subject = state.subjects[subjectId];
                if (!subject) return '';
                return `<div class="subject-item" data-subject-id="${subjectId}" data-from-category="${id}" draggable="true">
                            <span>${subject.name} (${subject.credits}학점, ${subject.grade || ''})</span>
                            <span class="remove-subject-btn">×</span>
                        </div>`;
            }).join('');
            return `<div class="category-box" data-category-id="${id}" draggable="true">
                        <span class="remove-category-btn">×</span>
                        <div class="category-header">
                            <span class="category-name" contenteditable="true" spellcheck="false">${category.name}</span>
                            <span class="credits-info">
                                (<span class="current-credits">0</span> /
                                <span class="required-credits" contenteditable="true" spellcheck="false">${category.requiredCredits}</span> 학점)
                            </span>
                        </div>
                        <div class="category-subject-list">${subjectItemsHTML}</div>
                    </div>`;
        }).join('');
    };

    const updateOverallDisplay = () => {
        const currentCredits = calculateTotalCredits();
        const currentGPA = calculateGPA();
        DOMElements.currentTotalCreditsSpan.textContent = currentCredits;
        DOMElements.currentTotalCreditsSpan.className = currentCredits >= state.requiredTotalCredits ? 'sufficient' : 'insufficient';
        DOMElements.requiredTotalCreditsSpan.textContent = state.requiredTotalCredits;
        DOMElements.gpaDisplaySpan.textContent = currentGPA.toFixed(2);
        DOMElements.gpaDisplaySpan.className = currentGPA >= state.requiredGPA ? 'sufficient' : 'insufficient';
        DOMElements.requiredGPASpan.textContent = state.requiredGPA.toFixed(2);
    };

    const updateAllCategoryCredits = () => {
        Object.entries(state.categories).forEach(([id, category]) => {
            let currentCredits = 0;
            category.subjects.forEach(subjectId => {
                const subject = state.subjects[subjectId];
                if (subject && subject.grade !== 'NP') currentCredits += (parseFloat(subject.credits) || 0);
            });
            const categoryBox = DOMElements.categoryContainer.querySelector(`.category-box[data-category-id="${id}"]`);
            if (categoryBox) {
                const creditSpan = categoryBox.querySelector('.current-credits');
                const requiredCredits = parseInt(categoryBox.querySelector('.required-credits').textContent, 10) || 0;
                creditSpan.textContent = currentCredits;
                creditSpan.className = `current-credits ${currentCredits >= requiredCredits ? 'sufficient' : 'insufficient'}`;
            }
        });
    };

    const createGradeOptionsHTML = (selectedGrade = '') => Object.keys(GRADE_POINTS_MAP).map(grade => `<option value="${grade}" ${selectedGrade === grade ? 'selected' : ''}>${grade}</option>`).join('');

    // --- 액션 핸들러 ---
    const addSubject = (data = { name: '', credits: '', grade: '' }) => {
        const id = `sub-${state.nextSubjectId++}`;
        state.subjects[id] = data;
        render();
        DOMElements.subjectListBody.querySelector(`[data-subject-id="${id}"]`)?.cells[0].focus();
    };
    const removeSubject = (subjectId) => {
        delete state.subjects[subjectId];
        Object.values(state.categories).forEach(cat => cat.subjects = cat.subjects.filter(id => id !== subjectId));
        render();
    };
    const addRequiredSubject = () => {
        const id = `req-${state.nextRequiredSubjectId++}`;
        state.requiredSubjects[id] = { name: '' };
        render(); // 추가 후 전체를 다시 그려서 상태를 동기화
        DOMElements.requiredSubjectListBody.querySelector(`[data-req-subject-id="${id}"]`)?.cells[0].focus();
    };
    const removeRequiredSubject = (subjectId) => {
        delete state.requiredSubjects[subjectId];
        render(); // 삭제 후 전체를 다시 그려서 상태를 동기화
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

    // --- 이벤트 리스너 바인딩 ---
    const bindEventListeners = () => {
        document.addEventListener('click', e => {
            const target = e.target;
            if (target.matches('#add-subject-btn')) return addSubject();
            if (target.matches('#add-category-btn')) return addCategory();
            if (target.matches('#add-required-subject-btn')) return addRequiredSubject(); // 필수 과목 추가
            if (target.closest('#excel-upload-btn')) return DOMElements.excelFileInput.click();
            
            const removeMainBtn = target.closest('.remove-main-subject-btn');
            if (removeMainBtn) return removeSubject(removeMainBtn.closest('tr').dataset.subjectId);

            const removeReqBtn = target.closest('.remove-required-subject-btn'); // 필수 과목 삭제
            if (removeReqBtn) return removeRequiredSubject(removeReqBtn.closest('tr').dataset.reqSubjectId);

            const removeCatBtn = target.closest('.remove-category-btn');
            if (removeCatBtn) return removeCategory(removeCatBtn.closest('.category-box').dataset.categoryId);
            
            const removeSubFromCatBtn = target.closest('.remove-subject-btn');
            if (removeSubFromCatBtn) {
                const item = removeSubFromCatBtn.closest('.subject-item');
                return removeSubjectFromCategory(item.dataset.subjectId, item.dataset.fromCategory);
            }
        });

        document.addEventListener('change', e => {
            if (e.target.matches('.grade-select')) {
                const subjectId = e.target.closest('tr').dataset.subjectId;
                if (state.subjects[subjectId]) {
                    state.subjects[subjectId].grade = e.target.value;
                    updateSubjectDisplays(subjectId);
                }
            }
            if (e.target.id === 'excel-file-input') handleExcelFile(e);
        });
        document.addEventListener('blur', e => {
            if (!e.target.isContentEditable) return;
            const el = e.target;
            const value = el.textContent.trim();

            const subjectRow = el.closest('tr[data-subject-id]');
            if (subjectRow) {
                const subjectId = subjectRow.dataset.subjectId;
                const field = el.cellIndex === 0 ? 'name' : 'credits';
                if (state.subjects[subjectId]) {
                    state.subjects[subjectId][field] = (field === 'credits' && isNaN(parseFloat(value))) ? '' : value;
                    updateSubjectDisplays(subjectId);
                }
                return;
            }

            const reqSubjectRow = el.closest('tr[data-req-subject-id]');
            if (reqSubjectRow) {
                const reqSubjectId = reqSubjectRow.dataset.reqSubjectId;
                if (state.requiredSubjects[reqSubjectId]) {
                    state.requiredSubjects[reqSubjectId].name = value;
                    renderRequiredSubjects(); 
                    saveState();
                }
                return;
            }

            const categoryBox = el.closest('.category-box[data-category-id]');
            if (categoryBox) {
                const categoryId = categoryBox.dataset.categoryId;
                const field = el.matches('.category-name') ? 'name' : 'requiredCredits';
                if (state.categories[categoryId]) {
                    state.categories[categoryId][field] = field === 'requiredCredits' ? (parseInt(value, 10) || 0) : value;
                    updateCalculatedDisplays();
                }
                return;
            }

            if (el.id === 'required-total-credits') state.requiredTotalCredits = parseInt(value, 10) || state.requiredTotalCredits;
            else if (el.id === 'required-gpa') state.requiredGPA = parseFloat(value) || state.requiredGPA;
            updateCalculatedDisplays();

        }, true);
        bindDragAndDropListeners();
    };

    // --- 드래그 앤 드롭 ---
    let draggedElement = null, lastDragOverTarget = null;
    const bindDragAndDropListeners = () => {
        document.addEventListener('dragstart', handleDragStart);
        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('dragleave', handleDragLeave);
        document.addEventListener('drop', handleDrop);
        document.addEventListener('dragend', handleDragEnd);
    };
    const handleDragStart = e => {
        if (e.target.closest('tr[data-req-subject-id]')) { // 필수 과목은 드래그 비활성화
            e.preventDefault();
            return;
        }
        if (e.target.isContentEditable) return;
        draggedElement = e.target.closest('[draggable="true"]');
        if (!draggedElement) return;
        e.dataTransfer.effectAllowed = 'move';
        const { subjectId, categoryId, fromCategory } = draggedElement.dataset;
        if (categoryId) e.dataTransfer.setData('text/category-id', categoryId);
        else if (subjectId) {
            e.dataTransfer.setData('text/subject-id', subjectId);
            if (fromCategory) e.dataTransfer.setData('text/from-category', fromCategory);
        }
        setTimeout(() => draggedElement.classList.add('dragging'), 0);
    };
    const handleDragOver = e => {
        e.preventDefault();
        const target = e.target.closest('.category-box, tr[data-subject-id], .subject-item');
        if (lastDragOverTarget && lastDragOverTarget !== target) lastDragOverTarget.classList.remove('drag-over');
        lastDragOverTarget = target;
        if (target && target !== draggedElement) {
            const fromCategoryId = draggedElement.dataset.fromCategory;
            const isHoveringOverSameCategoryBox = fromCategoryId && target.matches('.category-box') && fromCategoryId === target.dataset.categoryId;
            if (!isHoveringOverSameCategoryBox) target.classList.add('drag-over');
        }
    };
    const handleDragLeave = e => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        e.target.closest('.drag-over')?.classList.remove('drag-over');
    };
    const handleDragEnd = () => {
        draggedElement?.classList.remove('dragging');
        lastDragOverTarget?.classList.remove('drag-over');
        draggedElement = null;
        lastDragOverTarget = null;
    };
    const handleDrop = e => {
        e.preventDefault();
        if (!draggedElement) return;
        const draggedCategoryId = e.dataTransfer.getData('text/category-id');
        const draggedSubjectId = e.dataTransfer.getData('text/subject-id');
        if (draggedCategoryId) handleCategoryDrop(e, draggedCategoryId);
        else if (draggedSubjectId) handleSubjectDrop(e, draggedSubjectId);
        render();
    };
    const handleCategoryDrop = (e, draggedId) => {
        const targetCategoryBox = e.target.closest('.category-box');
        if (!targetCategoryBox || targetCategoryBox.dataset.categoryId === draggedId) return;
        const targetId = targetCategoryBox.dataset.categoryId;
        const ids = Object.keys(state.categories);
        const fromIndex = ids.indexOf(draggedId);
        const toIndex = ids.indexOf(targetId);
        const [item] = ids.splice(fromIndex, 1);
        ids.splice(toIndex, 0, item);
        state.categories = Object.fromEntries(ids.map(id => [id, state.categories[id]]));
    };
    const reorderItemInArray = (arr, itemId, targetItemId, e, targetElement) => {
        const fromIndex = arr.indexOf(itemId);
        if (fromIndex !== -1) arr.splice(fromIndex, 1);
        const toIndex = arr.indexOf(targetItemId);
        const rect = targetElement.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;
        arr.splice(insertBefore ? toIndex : toIndex + 1, 0, itemId);
    };
    const handleSubjectDrop = (e, subjectId) => {
        const fromCategoryId = e.dataTransfer.getData('text/from-category');
        const targetCategoryBox = e.target.closest('.category-box');
        const targetSubjectItem = e.target.closest('.subject-item');
        const targetMainListRow = e.target.closest('tr[data-subject-id]');
        if (fromCategoryId && targetSubjectItem && targetSubjectItem.dataset.fromCategory === fromCategoryId) {
            reorderItemInArray(state.categories[fromCategoryId].subjects, subjectId, targetSubjectItem.dataset.subjectId, e, targetSubjectItem);
        } else if (!fromCategoryId && targetMainListRow) {
            const subjectIds = Object.keys(state.subjects);
            reorderItemInArray(subjectIds, subjectId, targetMainListRow.dataset.subjectId, e, targetMainListRow);
            state.subjects = Object.fromEntries(subjectIds.map(id => [id, state.subjects[id]]));
        } else if (targetCategoryBox) {
            const toCategoryId = targetCategoryBox.dataset.categoryId;
            if (fromCategoryId && fromCategoryId !== toCategoryId) state.categories[fromCategoryId].subjects = state.categories[fromCategoryId].subjects.filter(id => id !== subjectId);
            if (!state.categories[toCategoryId].subjects.includes(subjectId)) {
                const subjectIds = state.categories[toCategoryId].subjects;
                if (targetSubjectItem) reorderItemInArray(subjectIds, subjectId, targetSubjectItem.dataset.subjectId, e, targetSubjectItem);
                else subjectIds.push(subjectId);
            }
        } else if (fromCategoryId && !targetCategoryBox) {
            state.categories[fromCategoryId].subjects = state.categories[fromCategoryId].subjects.filter(id => id !== subjectId);
        }
    };

    // --- 엑셀 파일 처리 ---
    const handleExcelFile = event => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                XLSX.utils.sheet_to_json(worksheet).forEach(row => {
                    if (row['교과목명'] && row['학점'] !== undefined && row['등급'] !== undefined) {
                        const id = `sub-${state.nextSubjectId++}`;
                        state.subjects[id] = { name: String(row['교과목명']), credits: String(row['학점']), grade: String(row['등급']).toUpperCase().trim() };
                    }
                });
                render();
            } catch (error) {
                console.error("Error processing Excel file:", error);
                alert("엑셀 파일을 처리하는 중 오류가 발생했습니다.");
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    };

    // --- 애플리케이션 초기화 ---
    const init = () => {
        const style = document.createElement('style');
        style.textContent = `.dragging{opacity:0.4}.category-box.drag-over{box-shadow:0 0 0 1.5px #ccc!important}#subject-list-table tbody tr{position:relative}tr.drag-over td:first-child::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;border:1.5px solid #ccc;border-radius:4px;pointer-events:none}.subject-item.drag-over{background-color:#f0f0f0}`;
        document.head.append(style);

        loadState();
        bindEventListeners();

        // 초기 렌더링
        if (Object.keys(state.subjects).length === 0 && Object.keys(state.requiredSubjects).length === 0) {
            addSubject();
            addRequiredSubject();
        } else {
            render();
        }
    };

    init();
});