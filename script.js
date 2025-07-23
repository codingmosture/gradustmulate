document.addEventListener('DOMContentLoaded', () => {
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
        excelFileInput: document.getElementById('excel-file-input')
    };

    // --- Data Management ---
    let subjects = {}; // { id: { name, credits, grade } }
    let categories = {}; // { id: { name, requiredCredits, subjects: [subjectId, ...] } }
    let nextSubjectId = 1;
    let nextCategoryId = 1;
    let requiredTotalCredits = 130; // 졸업 요구 학점 초기값
    let requiredGPA = 2.00; // 졸업 요구 평균 평점 초기값

    const gradePointsMap = {
        'A+': 4.5, 'A0': 4.0, 'B+': 3.5, 'B0': 3.0,
        'C+': 2.5, 'C0': 2.0, 'D+': 1.5, 'D0': 1.0,
        'F': 0.0, 'P': 0.0, 'NP': 0.0
    };

    // --- Utility Functions ---
    const saveData = () => {
        localStorage.setItem('subjects', JSON.stringify(subjects));
        localStorage.setItem('categories', JSON.stringify(categories));
        localStorage.setItem('nextSubjectId', nextSubjectId);
        localStorage.setItem('nextCategoryId', nextCategoryId);
        localStorage.setItem('requiredTotalCredits', requiredTotalCredits);
        localStorage.setItem('requiredGPA', requiredGPA);
    };

    const loadData = () => {
        const savedSubjects = localStorage.getItem('subjects');
        const savedCategories = localStorage.getItem('categories');
        const savedNextSubjectId = localStorage.getItem('nextSubjectId');
        const savedNextCategoryId = localStorage.getItem('nextCategoryId');
        const savedRequiredTotalCredits = localStorage.getItem('requiredTotalCredits');
        const savedRequiredGPA = localStorage.getItem('requiredGPA');

        if (savedSubjects) subjects = JSON.parse(savedSubjects);
        if (savedCategories) categories = JSON.parse(savedCategories);
        if (savedNextSubjectId) nextSubjectId = parseInt(savedNextSubjectId);
        if (savedNextCategoryId) nextCategoryId = parseInt(savedNextCategoryId);
        if (savedRequiredTotalCredits) requiredTotalCredits = parseFloat(savedRequiredTotalCredits);
        if (savedRequiredGPA) requiredGPA = parseFloat(savedRequiredGPA);

        renderSubjects();
        renderCategories();
    };

    const calculateTotalCredits = () => {
        let totalCredits = 0;
        Object.values(subjects).forEach(subject => {
            if (subject.grade !== 'NP' && !isNaN(parseFloat(subject.credits))) {
                totalCredits += parseFloat(subject.credits);
            }
        });
        return totalCredits;
    };

    const calculateGPA = () => {
        let totalGradePoints = 0;
        let totalCreditsForGPA = 0;

        Object.values(subjects).forEach(subject => {
            const credits = parseFloat(subject.credits);
            const grade = subject.grade;

            if (grade !== 'NP' && grade !== 'P' && !isNaN(credits) && credits > 0) {
                const gradePoint = gradePointsMap[grade];
                if (gradePoint !== undefined) {
                    totalGradePoints += (gradePoint * credits);
                    totalCreditsForGPA += credits;
                }
            }
        });

        return totalCreditsForGPA === 0 ? 0.00 : (totalGradePoints / totalCreditsForGPA).toFixed(2);
    };

    const updateOverallDisplay = () => {
        const { currentTotalCreditsSpan, requiredTotalCreditsSpan, gpaDisplaySpan, requiredGPASpan } = DOMElements;

        const currentCredits = calculateTotalCredits();
        currentTotalCreditsSpan.textContent = currentCredits;
        currentTotalCreditsSpan.classList.toggle('insufficient', currentCredits < requiredTotalCredits);
        currentTotalCreditsSpan.classList.toggle('sufficient', currentCredits >= requiredTotalCredits);

        requiredTotalCreditsSpan.textContent = requiredTotalCredits;

        const currentGPA = parseFloat(calculateGPA());
        gpaDisplaySpan.textContent = currentGPA.toFixed(2);
        gpaDisplaySpan.classList.toggle('insufficient', currentGPA < requiredGPA);
        gpaDisplaySpan.classList.toggle('sufficient', currentGPA >= requiredGPA);

        requiredGPASpan.textContent = requiredGPA.toFixed(2);
        saveData();
    };

    const removeSubject = (subjectId) => {
        delete subjects[subjectId];
        const subjectRow = DOMElements.subjectListTableBody.querySelector(`[data-subject-id="${subjectId}"]`);
        if (subjectRow) subjectRow.remove();

        Object.keys(categories).forEach(categoryId => {
            removeSubjectFromCategory(subjectId, categoryId, true);
        });
        updateOverallDisplay();
        saveData();
    };

    const removeCategory = (categoryId) => {
        delete categories[categoryId];
        const categoryBox = document.querySelector(`[data-category-id="${categoryId}"]`);
        if (categoryBox) categoryBox.remove();
        saveData();
    };

    const updateCategoryCredits = (categoryId) => {
        const category = categories[categoryId];
        const categoryBox = document.querySelector(`[data-category-id="${categoryId}"]`);
        if (!category || !categoryBox) return;

        let currentCredits = 0;
        category.subjects.forEach(subjectId => {
            const subject = subjects[subjectId];
            if (subject && subject.grade !== 'NP' && !isNaN(parseFloat(subject.credits))) {
                currentCredits += parseFloat(subject.credits);
            }
        });

        const currentCreditsSpan = categoryBox.querySelector('.current-credits');
        currentCreditsSpan.textContent = currentCredits;
        currentCreditsSpan.classList.toggle('insufficient', currentCredits < category.requiredCredits);
        currentCreditsSpan.classList.toggle('sufficient', currentCredits >= category.requiredCredits);
        saveData();
    };

    const updateCategoriesWithSubject = (subjectId) => {
        Object.keys(categories).forEach(categoryId => {
            if (categories[categoryId].subjects.includes(subjectId)) {
                const subjectItem = document.querySelector(`[data-category-id="${categoryId}"] [data-subject-id="${subjectId}"]`);
                if (subjectItem) {
                    const subject = subjects[subjectId];
                    subjectItem.querySelector('span').textContent = `${subject.name} (${subject.credits}학점, ${subject.grade})`;
                }
                updateCategoryCredits(categoryId);
            }
        });
        saveData();
    };

    const removeSubjectFromCategory = (subjectId, categoryId, updateDOM = true) => {
        const category = categories[categoryId];
        if (category && category.subjects.includes(subjectId)) {
            category.subjects = category.subjects.filter(id => id !== subjectId);
            if (updateDOM) {
                const subjectItem = document.querySelector(`[data-category-id="${categoryId}"] [data-subject-id="${subjectId}"]`);
                if (subjectItem) subjectItem.remove();
            }
            updateCategoryCredits(categoryId);
            saveData();
        }
    };

    // --- HTML Generation Functions ---
    const createSubjectRowHTML = (subject, subjectId) => `
        <td contenteditable="true" spellcheck="false">${subject.name}</td>
        <td contenteditable="true" spellcheck="false">${subject.credits}</td>
        <td>
            <select class="grade-select" spellcheck="false">
                <option value=""></option>
                <option value="A+">A+</option>
                <option value="A0">A0</option>
                <option value="B+">B+</option>
                <option value="B0">B0</option>
                <option value="C+">C+</option>
                <option value="C0">C0</option>
                <option value="D+">D+</option>
                <option value="D0">D0</option>
                <option value="F">F</option>
                <option value="P">P</option>
                <option value="NP">NP</option>
            </select>
        </td>
    `;

    const createCategoryBoxHTML = (category, categoryId) => `
        <span class="remove-category-btn">&times;</span>
        <div class="category-header">
            <span class="category-name" contenteditable="true" spellcheck="false">${category.name}</span>
            <span class="credits-info">
                (<span class="current-credits insufficient">0</span> /
                <span class="required-credits" contenteditable="true" spellcheck="false">${category.requiredCredits}</span> 학점)
            </span>
        </div>
    `;

    const createSubjectItemHTML = (subject, subjectId) => `
        <span>${subject.name} (${subject.credits}학점, ${subject.grade})</span>
        <span class="remove-subject-btn">&times;</span>
    `;

    // --- Event Listener Attachment Functions ---
    const attachSubjectRowEventListeners = (row, subjectId) => {
        row.setAttribute('draggable', 'true');

        Array.from(row.cells).forEach((cell, index) => {
            if (index === 0) { // Subject Name
                cell.addEventListener('blur', () => {
                    subjects[subjectId].name = cell.textContent.trim();
                    updateCategoriesWithSubject(subjectId);
                    updateOverallDisplay();
                });
            } else if (index === 1) { // Credits
                cell.addEventListener('blur', () => {
                    let credits = cell.textContent.trim();
                    if (isNaN(parseFloat(credits)) || !isFinite(credits)) {
                        credits = '';
                        cell.textContent = '';
                    }
                    subjects[subjectId].credits = credits;
                    updateCategoriesWithSubject(subjectId);
                    updateOverallDisplay();
                });
            } else if (index === 2) { // Grade Select
                const gradeSelect = cell.querySelector('.grade-select');
                if (gradeSelect) {
                    gradeSelect.addEventListener('change', () => {
                        subjects[subjectId].grade = gradeSelect.value;
                        updateCategoriesWithSubject(subjectId);
                        updateOverallDisplay();
                    });
                }
            }
        });
    };

    const attachCategoryBoxEventListeners = (categoryBox, categoryId) => {
        categoryBox.querySelector('.remove-category-btn').addEventListener('click', () => removeCategory(categoryId));
        const nameSpan = categoryBox.querySelector('.category-name');
        const creditsSpan = categoryBox.querySelector('.required-credits');

        nameSpan.addEventListener('blur', () => {
            categories[categoryId].name = nameSpan.textContent.trim();
            saveData();
        });

        creditsSpan.addEventListener('blur', () => {
            const newCredits = parseInt(creditsSpan.textContent.trim(), 10);
            if (!isNaN(newCredits)) {
                categories[categoryId].requiredCredits = newCredits;
                updateCategoryCredits(categoryId);
                saveData();
            } else {
                creditsSpan.textContent = categories[categoryId].requiredCredits;
            }
        });
    };

    // --- Rendering Functions ---
    const renderSubjects = () => {
        DOMElements.subjectListTableBody.innerHTML = '';
        Object.keys(subjects).sort((a, b) => parseInt(a.replace('sub-', '')) - parseInt(b.replace('sub-', '')))
            .forEach(subjectId => {
                const subject = subjects[subjectId];
                const newRow = DOMElements.subjectListTableBody.insertRow();
                newRow.dataset.subjectId = subjectId;
                newRow.innerHTML = createSubjectRowHTML(subject, subjectId);

                const gradeSelect = newRow.querySelector('.grade-select');
                if (subject.grade) gradeSelect.value = subject.grade;

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'subject-row-actions';
                const removeBtn = document.createElement('span');
                removeBtn.className = 'remove-main-subject-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.addEventListener('click', () => removeSubject(subjectId));
                actionsDiv.appendChild(removeBtn);
                newRow.appendChild(actionsDiv);

                attachSubjectRowEventListeners(newRow, subjectId);
            });
    };

    const renderCategories = () => {
        DOMElements.categoryContainer.innerHTML = '';
        Object.keys(categories).sort((a, b) => parseInt(a.replace('cat-', '')) - parseInt(b.replace('cat-', '')))
            .forEach(categoryId => {
                const category = categories[categoryId];
                const categoryBox = document.createElement('div');
                categoryBox.className = 'category-box';
                categoryBox.dataset.categoryId = categoryId;
                categoryBox.innerHTML = createCategoryBoxHTML(category, categoryId);
                DOMElements.categoryContainer.appendChild(categoryBox);

                attachCategoryBoxEventListeners(categoryBox, categoryId);

                category.subjects.forEach(subjectId => {
                    createSubjectItemInCategory(subjectId, categoryId);
                });
                updateCategoryCredits(categoryId);
            });
    };

    const createNewSubjectRow = (subjectData = { name: '', credits: '', grade: '' }, subjectId = `sub-${nextSubjectId++}`) => {
        const newRow = DOMElements.subjectListTableBody.insertRow();
        newRow.dataset.subjectId = subjectId;
        newRow.innerHTML = createSubjectRowHTML(subjectData, subjectId);

        const gradeSelect = newRow.querySelector('.grade-select');
        if (subjectData.grade) gradeSelect.value = subjectData.grade;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'subject-row-actions';
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-main-subject-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', () => removeSubject(subjectId));
        actionsDiv.appendChild(removeBtn);
        newRow.appendChild(actionsDiv);

        subjects[subjectId] = subjectData;
        attachSubjectRowEventListeners(newRow, subjectId);
        newRow.cells[0].focus();
        updateOverallDisplay();
        saveData();
    };

    const createSubjectItemInCategory = (subjectId, categoryId) => {
        const subject = subjects[subjectId];
        const categoryBox = document.querySelector(`[data-category-id="${categoryId}"]`);
        if (!subject || !categoryBox) return;

        const subjectItem = document.createElement('div');
        subjectItem.className = 'subject-item';
        subjectItem.dataset.subjectId = subjectId;
        subjectItem.dataset.fromCategory = categoryId;
        subjectItem.setAttribute('draggable', 'true');
        subjectItem.innerHTML = createSubjectItemHTML(subject, subjectId);
        
        subjectItem.querySelector('.remove-subject-btn').addEventListener('click', () => {
            removeSubjectFromCategory(subjectId, categoryId);
        });

        categoryBox.appendChild(subjectItem);
        saveData();
    };

    // --- Event Listeners ---
    DOMElements.subjectListTableBody.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const currentCell = event.target;
            const currentRow = currentCell.parentElement;
            if (currentCell.cellIndex < 2) {
                 currentRow.cells[currentCell.cellIndex + 1].focus();
            } else if (currentCell.cellIndex === 2) {
                currentRow.cells[0].focus();
            }
        }
    });

    let draggedRow = null;

    DOMElements.subjectListTableBody.addEventListener('dragstart', (e) => {
        draggedRow = e.target.closest('tr');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedRow.dataset.subjectId);
    });

    DOMElements.subjectListTableBody.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetRow = e.target.closest('tr');
        if (targetRow && targetRow !== draggedRow) {
            const boundingBox = targetRow.getBoundingClientRect();
            const offset = boundingBox.y + (boundingBox.height / 2);
            if (e.clientY < offset) {
                DOMElements.subjectListTableBody.insertBefore(draggedRow, targetRow);
            } else {
                DOMElements.subjectListTableBody.insertBefore(draggedRow, targetRow.nextSibling);
            }
        }
    });

    DOMElements.subjectListTableBody.addEventListener('dragend', () => {
        draggedRow = null;
        const newSubjectOrder = {};
        Array.from(DOMElements.subjectListTableBody.children).forEach(row => {
            const subjectId = row.dataset.subjectId;
            newSubjectOrder[subjectId] = subjects[subjectId];
        });
        subjects = newSubjectOrder;
        saveData();
    });

    DOMElements.addSubjectBtn.addEventListener('click', () => createNewSubjectRow());

    DOMElements.addCategoryBtn.addEventListener('click', () => {
        const categoryId = `cat-${nextCategoryId++}`;
        const categoryBox = document.createElement('div');
        categoryBox.className = 'category-box';
        categoryBox.dataset.categoryId = categoryId;
        categoryBox.innerHTML = createCategoryBoxHTML({ name: '새 카테고리', requiredCredits: 15 }, categoryId);
        DOMElements.categoryContainer.appendChild(categoryBox);
        categories[categoryId] = { name: '새 카테고리', requiredCredits: 15, subjects: [] };
        saveData();

        attachCategoryBoxEventListeners(categoryBox, categoryId);
    });

    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('subject-item')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.subjectId);
            e.dataTransfer.setData('from-category', e.target.dataset.fromCategory);
            e.dataTransfer.effectAllowed = 'copy';
        }
    });

    DOMElements.categoryContainer.addEventListener('dragover', (e) => e.preventDefault());
    DOMElements.categoryContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const subjectId = e.dataTransfer.getData('text/plain');
        const fromCategoryId = e.dataTransfer.getData('from-category');
        const targetCategoryBox = e.target.closest('.category-box');

        if (!subjectId) return;

        if (targetCategoryBox) {
            const toCategoryId = targetCategoryBox.dataset.categoryId;
            if (fromCategoryId && fromCategoryId !== toCategoryId) {
                removeSubjectFromCategory(subjectId, fromCategoryId);
            }
            const category = categories[toCategoryId];
            if (!category.subjects.includes(subjectId)) {
                category.subjects.push(subjectId);
                createSubjectItemInCategory(subjectId, toCategoryId);
                updateCategoryCredits(toCategoryId);
                saveData();
            }
        }
    });
    
    DOMElements.leftPanel.addEventListener('dragover', e => e.preventDefault());
    DOMElements.leftPanel.addEventListener('drop', e => {
        e.preventDefault();
        if (!e.target.closest('#category-container')) {
            const subjectId = e.dataTransfer.getData('text/plain');
            const fromCategoryId = e.dataTransfer.getData('from-category');
            if (subjectId && fromCategoryId) {
                removeSubjectFromCategory(subjectId, fromCategoryId);
                saveData();
            }
        }
    });

    // --- Initialization ---
    loadData();

    if (Object.keys(subjects).length === 0) {
        createNewSubjectRow();
    }
    updateOverallDisplay();

    if (DOMElements.requiredTotalCreditsSpan) {
        DOMElements.requiredTotalCreditsSpan.addEventListener('blur', () => {
            const newRequiredCredits = parseInt(DOMElements.requiredTotalCreditsSpan.textContent.trim(), 10);
            if (!isNaN(newRequiredCredits)) {
                requiredTotalCredits = newRequiredCredits;
                updateOverallDisplay();
            } else {
                DOMElements.requiredTotalCreditsSpan.textContent = requiredTotalCredits;
            }
        });
    }

    if (DOMElements.requiredGPASpan) {
        DOMElements.requiredGPASpan.addEventListener('blur', () => {
            const newRequiredGPA = parseFloat(DOMElements.requiredGPASpan.textContent.trim());
            if (!isNaN(newRequiredGPA)) {
                requiredGPA = newRequiredGPA;
                updateOverallDisplay();
            } else {
                DOMElements.requiredGPASpan.textContent = requiredGPA.toFixed(2);
            }
        });
    }

    // --- Excel File Processing Logic ---
    if (DOMElements.excelUploadBtn && DOMElements.excelFileInput) {
        DOMElements.excelUploadBtn.addEventListener('click', () => {
            DOMElements.excelFileInput.click();
        });

        DOMElements.excelFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    const initialSubjectIds = Object.keys(subjects);
                    if (initialSubjectIds.length === 1) {
                        const firstSubject = subjects[initialSubjectIds[0]];
                        if (firstSubject.name === '' && firstSubject.credits === '' && firstSubject.grade === '') {
                            delete subjects[initialSubjectIds[0]];
                        }
                    }

                    jsonData.forEach(row => {
                        const subjectName = row['교과목명'];
                        const credits = row['학점'];
                        const grade = row['등급'];

                        if (subjectName && credits !== undefined && grade !== undefined) {
                            const subjectId = `sub-${nextSubjectId++}`;
                            subjects[subjectId] = {
                                name: String(subjectName),
                                credits: String(credits),
                                grade: String(grade).toUpperCase().trim()
                            };
                        }
                    });

                    renderSubjects();
                    updateOverallDisplay();
                    saveData();

                } catch (error) {
                    console.error("Error processing Excel file:", error);
                    alert("엑셀 파일을 처리하는 중 오류가 발생했습니다. 파일이 암호화되어 있는지 확인해주세요.");
                }
            };
            reader.readAsArrayBuffer(file);
            event.target.value = '';
        });
    }
});