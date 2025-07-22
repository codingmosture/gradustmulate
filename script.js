document.addEventListener('DOMContentLoaded', () => {
    const subjectListTableBody = document.getElementById('subject-list');
    const addSubjectBtn = document.getElementById('add-subject-btn');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const categoryContainer = document.getElementById('category-container');
    const leftPanel = document.getElementById('left-panel');

    // --- 데이터 관리 --- //
    let subjects = {}; // { id: { name, credits, grade } }
    let categories = {}; // { id: { name, requiredCredits, subjects: [subjectId, ...] } }
    let nextSubjectId = 1;
    let nextCategoryId = 1;
    let requiredTotalCredits = 130; // 졸업 요구 학점 초기값
    let requiredGPA = 2.00; // 졸업 요구 평균 평점 초기값

    const gradePointsMap = {
        'A+': 4.5,
        'A0': 4.0,
        'B+': 3.5,
        'B0': 3.0,
        'C+': 2.5,
        'C0': 2.0,
        'D+': 1.5,
        'D0': 1.0,
        'F': 0.0, // F는 평점 계산에 포함되지 않지만, 매핑을 위해 0으로 설정
        'P': 0.0, // P는 평점 계산에 포함되지 않음
        'NP': 0.0 // NP는 평점 계산에 포함되지 않음
    };

    // --- 데이터 저장 및 로드 함수 --- //
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

        if (savedSubjects) {
            subjects = JSON.parse(savedSubjects);
        }
        if (savedCategories) {
            categories = JSON.parse(savedCategories);
        }
        if (savedNextSubjectId) {
            nextSubjectId = parseInt(savedNextSubjectId);
        }
        if (savedNextCategoryId) {
            nextCategoryId = parseInt(savedNextCategoryId);
        }
        if (savedRequiredTotalCredits) {
            requiredTotalCredits = parseFloat(savedRequiredTotalCredits);
        }
        if (savedRequiredGPA) {
            requiredGPA = parseFloat(savedRequiredGPA);
        }

        // UI 렌더링
        renderSubjects();
        renderCategories();
    };

    const renderSubjects = () => {
        subjectListTableBody.innerHTML = ''; // 기존 내용 비우기
        Object.keys(subjects).sort((a, b) => {
            // Extract the numeric part of the ID for sorting
            const numA = parseInt(a.replace('sub-', ''));
            const numB = parseInt(b.replace('sub-', ''));
            return numA - numB;
        }).forEach(subjectId => {
            const subject = subjects[subjectId];
            const newRow = subjectListTableBody.insertRow();
            newRow.dataset.subjectId = subjectId;
            newRow.innerHTML = `
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
            // Set selected grade
            const gradeSelect = newRow.querySelector('.grade-select');
            if (subject.grade) {
                gradeSelect.value = subject.grade;
            }
            // Add remove button
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'subject-row-actions';
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-main-subject-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', () => removeSubject(subjectId));
            actionsDiv.appendChild(removeBtn);
            newRow.appendChild(actionsDiv);

            addRowEventListeners(newRow);
        });
    };

    const renderCategories = () => {
        categoryContainer.innerHTML = ''; // 기존 내용 비우기
        Object.keys(categories).sort((a, b) => {
            // Extract the numeric part of the ID for sorting
            const numA = parseInt(a.replace('cat-', ''));
            const numB = parseInt(b.replace('cat-', ''));
            return numA - numB;
        }).forEach(categoryId => {
            const category = categories[categoryId];
            const categoryBox = document.createElement('div');
            categoryBox.className = 'category-box';
            categoryBox.dataset.categoryId = categoryId;
            categoryBox.innerHTML = `
                <span class="remove-category-btn">&times;</span>
                <div class="category-header">
                    <span class="category-name" contenteditable="true" spellcheck="false">${category.name}</span>
                    <span class="credits-info">
                        (<span class="current-credits insufficient">0</span> /
                        <span class="required-credits" contenteditable="true" spellcheck="false">${category.requiredCredits}</span> 학점)
                    </span>
                </div>
            `;
            categoryContainer.appendChild(categoryBox);

            categoryBox.querySelector('.remove-category-btn').addEventListener('click', () => removeCategory(categoryId));
            const nameSpan = categoryBox.querySelector('.category-name');
            const creditsSpan = categoryBox.querySelector('.required-credits');
            nameSpan.addEventListener('blur', () => {
                categories[categoryId].name = nameSpan.textContent.trim();
                saveData(); // 데이터 변경 시 저장
            });
            creditsSpan.addEventListener('blur', () => {
                const newCredits = parseInt(creditsSpan.textContent.trim(), 10);
                if (!isNaN(newCredits)) {
                    categories[categoryId].requiredCredits = newCredits;
                    updateCategoryCredits(categoryId);
                    saveData(); // 데이터 변경 시 저장
                } else {
                    creditsSpan.textContent = categories[categoryId].requiredCredits;
                }
            });

            // Render subjects within this category
            category.subjects.forEach(subjectId => {
                createSubjectItemInCategory(subjectId, categoryId);
            });
            updateCategoryCredits(categoryId);
        });
    };


    // --- 총 학점 계산 함수 --- //
    const calculateTotalCredits = () => {
        let totalCredits = 0;
        Object.values(subjects).forEach(subject => {
            // F, NP를 제외한 과목의 학점만 합산
            if (subject.grade !== 'F' && subject.grade !== 'NP' && !isNaN(parseFloat(subject.credits))) {
                totalCredits += parseFloat(subject.credits);
            }
        });
        return totalCredits;
    };

    // --- GPA 계산 함수 --- //
    const calculateGPA = () => {
        let totalGradePoints = 0;
        let totalCreditsForGPA = 0;

        Object.values(subjects).forEach(subject => {
            const credits = parseFloat(subject.credits);
            const grade = subject.grade;

            // F, NP, P는 평점 계산에 포함하지 않음
            if (grade !== 'F' && grade !== 'NP' && grade !== 'P' && !isNaN(credits) && credits > 0) {
                const gradePoint = gradePointsMap[grade];
                if (gradePoint !== undefined) {
                    totalGradePoints += (gradePoint * credits);
                    totalCreditsForGPA += credits;
                }
            }
        });

        if (totalCreditsForGPA === 0) {
            return 0.00;
        } else {
            return (totalGradePoints / totalCreditsForGPA).toFixed(2);
        }
    };

    const updateOverallDisplay = () => {
        const currentTotalCreditsSpan = document.getElementById('current-total-credits');
        const requiredTotalCreditsSpan = document.getElementById('required-total-credits');
        const gpaDisplaySpan = document.getElementById('gpa-display');
        const requiredGPASpan = document.getElementById('required-gpa');

        if (currentTotalCreditsSpan) {
            const currentCredits = calculateTotalCredits();
            currentTotalCreditsSpan.textContent = currentCredits;
            currentTotalCreditsSpan.classList.remove('insufficient', 'sufficient');
            if (currentCredits < requiredTotalCredits) {
                currentTotalCreditsSpan.classList.add('insufficient');
            } else {
                currentTotalCreditsSpan.classList.add('sufficient');
            }
        }
        if (requiredTotalCreditsSpan) {
            requiredTotalCreditsSpan.textContent = requiredTotalCredits;
        }
        if (gpaDisplaySpan) {
            const currentGPA = parseFloat(calculateGPA());
            gpaDisplaySpan.textContent = currentGPA.toFixed(2);
            gpaDisplaySpan.classList.remove('insufficient', 'sufficient');
            if (currentGPA < requiredGPA) {
                gpaDisplaySpan.classList.add('insufficient');
            } else {
                gpaDisplaySpan.classList.add('sufficient');
            }
        }
        if (requiredGPASpan) {
            requiredGPASpan.textContent = requiredGPA.toFixed(2);
        }
        saveData(); // 전체 디스플레이 업데이트 시 저장
    };

    // --- 전역 삭제 함수 --- //
    const removeSubject = (subjectId) => {
        // 1. 전역 과목 목록에서 삭제
        delete subjects[subjectId];

        // 2. DOM에서 해당 과목 행 삭제
        const subjectRow = subjectListTableBody.querySelector(`[data-subject-id="${subjectId}"]`);
        if (subjectRow) subjectRow.remove();

        // 3. 이 과목을 포함하는 모든 카테고리에서 제거 및 업데이트
        Object.keys(categories).forEach(categoryId => {
            removeSubjectFromCategory(subjectId, categoryId, true); // DOM도 함께 정리
        });
        updateOverallDisplay(); // 과목 삭제 후 총 학점 업데이트
        saveData(); // 데이터 변경 시 저장
    };

    const removeCategory = (categoryId) => {
        delete categories[categoryId];
        const categoryBox = document.querySelector(`[data-category-id="${categoryId}"]`);
        if (categoryBox) categoryBox.remove();
        saveData(); // 데이터 변경 시 저장
    };

    // --- 렌더링 및 업데이트 함수 --- //

    const updateCategoryCredits = (categoryId) => {
        const category = categories[categoryId];
        const categoryBox = document.querySelector(`[data-category-id="${categoryId}"]`);
        if (!category || !categoryBox) return;

        let currentCredits = 0;
        category.subjects.forEach(subjectId => {
            const subject = subjects[subjectId];
            if (subject && subject.grade !== 'NP' && subject.grade !== 'F' && !isNaN(parseFloat(subject.credits))) {
                currentCredits += parseFloat(subject.credits);
            }
        });

        const currentCreditsSpan = categoryBox.querySelector('.current-credits');
        currentCreditsSpan.textContent = currentCredits;

        currentCreditsSpan.classList.remove('insufficient', 'sufficient');
        if (currentCredits < category.requiredCredits) {
            currentCreditsSpan.classList.add('insufficient');
        } else {
            currentCreditsSpan.classList.add('sufficient');
        }
        saveData(); // 카테고리 학점 업데이트 시 저장
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
        saveData(); // 카테고리 내 과목 업데이트 시 저장
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
        
        const textSpan = document.createElement('span');
        textSpan.textContent = `${subject.name} (${subject.credits}학점, ${subject.grade})`;
        subjectItem.appendChild(textSpan);

        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-subject-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', () => {
            removeSubjectFromCategory(subjectId, categoryId);
            saveData(); // 데이터 변경 시 저장
        });
        subjectItem.appendChild(removeBtn);

        categoryBox.appendChild(subjectItem);
        saveData(); // 카테고리에 과목 추가 시 저장
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
            saveData(); // 데이터 변경 시 저장
        }
    };

    // --- 이벤트 핸들러 --- //

    const addRowEventListeners = (row) => {
        row.setAttribute('draggable', 'true');

        const allowedGrades = ['A+', 'A0', 'B+', 'B0', 'C+', 'C0', 'D+', 'D0', 'F', 'P', 'NP'];

        Array.from(row.cells).forEach((cell, index) => {
            if (index === 0) { // 과목명 셀
                cell.addEventListener('blur', () => {
                    const subjectId = row.dataset.subjectId;
                    subjects[subjectId].name = cell.textContent.trim();
                    updateCategoriesWithSubject(subjectId);
                    updateOverallDisplay(); // 과목명 변경 후 총 학점 업데이트
                    saveData(); // 데이터 변경 시 저장
                });
            } else if (index === 1) { // 학점 셀
                cell.addEventListener('blur', () => {
                    const subjectId = row.dataset.subjectId;
                    let credits = cell.textContent.trim();
                    if (isNaN(parseFloat(credits)) || !isFinite(credits)) {
                        credits = ''; // 숫자가 아니면 빈 문자열로
                        cell.textContent = '';
                    }
                    subjects[subjectId].credits = credits;
                    updateCategoriesWithSubject(subjectId);
                    updateOverallDisplay(); // 학점 변경 후 총 학점 업데이트
                    saveData(); // 데이터 변경 시 저장
                });
            } else if (index === 2) { // 성적 셀 (select box)
                const gradeSelect = cell.querySelector('.grade-select');
                if (gradeSelect) {
                    gradeSelect.addEventListener('change', () => {
                        const subjectId = row.dataset.subjectId;
                        subjects[subjectId].grade = gradeSelect.value;
                        updateCategoriesWithSubject(subjectId);
                        updateOverallDisplay(); // 성적 변경 후 총 학점 업데이트
                        saveData(); // 데이터 변경 시 저장
                    });
                }
            }
        });
    };

    const createNewSubjectRow = (subjectData = { name: '', credits: '', grade: '' }, subjectId = `sub-${nextSubjectId++}`) => {
        const newRow = subjectListTableBody.insertRow();
        newRow.dataset.subjectId = subjectId;
        newRow.innerHTML = `
            <td contenteditable="true" spellcheck="false">${subjectData.name}</td>
            <td contenteditable="true" spellcheck="false">${subjectData.credits}</td>
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
        const gradeSelect = newRow.querySelector('.grade-select');
        if (subjectData.grade) {
            gradeSelect.value = subjectData.grade;
        }

        // 삭제 버튼을 위한 div 추가
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'subject-row-actions';
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-main-subject-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', () => removeSubject(subjectId));
        actionsDiv.appendChild(removeBtn);
        newRow.appendChild(actionsDiv);

        subjects[subjectId] = subjectData;
        addRowEventListeners(newRow);
        newRow.cells[0].focus();
        updateOverallDisplay(); // 새 과목 추가 후 총 학점 업데이트
        saveData(); // 데이터 변경 시 저장
    };

    subjectListTableBody.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const currentCell = event.target;
            const currentRow = currentCell.parentElement;
            if (currentCell.cellIndex < 2) { 
                 currentRow.cells[currentCell.cellIndex + 1].focus();
            } else if (currentCell.cellIndex === 2) {
                // 성적 칸에서 엔터 시 다음 행으로 이동하지 않고, 현재 행의 첫 번째 셀로 포커스 이동
                currentRow.cells[0].focus();
            }
        }
    });

    let draggedRow = null;

    subjectListTableBody.addEventListener('dragstart', (e) => {
        draggedRow = e.target.closest('tr');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedRow.dataset.subjectId);
    });

    subjectListTableBody.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetRow = e.target.closest('tr');
        if (targetRow && targetRow !== draggedRow) {
            const boundingBox = targetRow.getBoundingClientRect();
            const offset = boundingBox.y + (boundingBox.height / 2);
            if (e.clientY < offset) {
                subjectListTableBody.insertBefore(draggedRow, targetRow);
            } else {
                subjectListTableBody.insertBefore(draggedRow, targetRow.nextSibling);
            }
        }
    });

    subjectListTableBody.addEventListener('dragend', () => {
        draggedRow = null;
        // Re-order subjects object based on DOM order
        const newSubjectOrder = {};
        Array.from(subjectListTableBody.children).forEach(row => {
            const subjectId = row.dataset.subjectId;
            newSubjectOrder[subjectId] = subjects[subjectId];
        });
        subjects = newSubjectOrder;
        saveData(); // 순서 변경 시 저장
    });

    addSubjectBtn.addEventListener('click', () => createNewSubjectRow());

    addCategoryBtn.addEventListener('click', () => {
        const categoryId = `cat-${nextCategoryId++}`;
        const categoryBox = document.createElement('div');
        categoryBox.className = 'category-box';
        categoryBox.dataset.categoryId = categoryId;
        categoryBox.innerHTML = `
            <span class="remove-category-btn">&times;</span>
            <div class="category-header">
                <span class="category-name" contenteditable="true" spellcheck="false">새 카테고리</span>
                <span class="credits-info">
                    (<span class="current-credits insufficient">0</span> /
                    <span class="required-credits" contenteditable="true" spellcheck="false">15</span> 학점)
                </span>
            </div>
        `;
        categoryContainer.appendChild(categoryBox);
        categories[categoryId] = { name: '새 카테고리', requiredCredits: 15, subjects: [] };
        saveData(); // 데이터 변경 시 저장

        categoryBox.querySelector('.remove-category-btn').addEventListener('click', () => removeCategory(categoryId));
        const nameSpan = categoryBox.querySelector('.category-name');
        const creditsSpan = categoryBox.querySelector('.required-credits');
        nameSpan.addEventListener('blur', () => {
            categories[categoryId].name = nameSpan.textContent.trim();
            saveData(); // 데이터 변경 시 저장
        });
        creditsSpan.addEventListener('blur', () => {
            const newCredits = parseInt(creditsSpan.textContent.trim(), 10);
            if (!isNaN(newCredits)) {
                categories[categoryId].requiredCredits = newCredits;
                updateCategoryCredits(categoryId);
                saveData(); // 데이터 변경 시 저장
            } else {
                creditsSpan.textContent = categories[categoryId].requiredCredits;
            }
        });
    });

    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('subject-item')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.subjectId);
            e.dataTransfer.setData('from-category', e.target.dataset.fromCategory);
            e.dataTransfer.effectAllowed = 'copy'; // Allow copying to categories
        }
    });

    categoryContainer.addEventListener('dragover', (e) => e.preventDefault());
    categoryContainer.addEventListener('drop', (e) => {
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
                saveData(); // 데이터 변경 시 저장
            }
        }
    });
    
    leftPanel.addEventListener('dragover', e => e.preventDefault());
    leftPanel.addEventListener('drop', e => {
        e.preventDefault();
        if (!e.target.closest('#category-container')) {
            const subjectId = e.dataTransfer.getData('text/plain');
            const fromCategoryId = e.dataTransfer.getData('from-category');
            if (subjectId && fromCategoryId) {
                removeSubjectFromCategory(subjectId, fromCategoryId);
                saveData(); // 데이터 변경 시 저장
            }
        }
    });
    // --- 초기화 --- //
    loadData(); // 데이터 로드

    // 로드된 과목이 없으면 빈 과목 행 하나 생성
    if (Object.keys(subjects).length === 0) {
        createNewSubjectRow();
    }
    updateOverallDisplay(); // 초기 로드 시 총 학점 표시 업데이트

    const requiredTotalCreditsSpan = document.getElementById('required-total-credits');
    if (requiredTotalCreditsSpan) {
        requiredTotalCreditsSpan.addEventListener('blur', () => {
            const newRequiredCredits = parseInt(requiredTotalCreditsSpan.textContent.trim(), 10);
            if (!isNaN(newRequiredCredits)) {
                requiredTotalCredits = newRequiredCredits;
                updateOverallDisplay();
                saveData(); // 데이터 변경 시 저장
            } else {
                requiredTotalCreditsSpan.textContent = requiredTotalCredits; // 유효하지 않으면 이전 값으로 되돌림
            }
        });
    }

    const requiredGPASpan = document.getElementById('required-gpa');
    if (requiredGPASpan) {
        requiredGPASpan.addEventListener('blur', () => {
            const newRequiredGPA = parseFloat(requiredGPASpan.textContent.trim());
            if (!isNaN(newRequiredGPA)) {
                requiredGPA = newRequiredGPA;
                updateOverallDisplay();
                saveData(); // 데이터 변경 시 저장
            } else {
                requiredGPASpan.textContent = requiredGPA.toFixed(2); // 유효하지 않으면 이전 값으로 되돌림
            }
        });
    }
});