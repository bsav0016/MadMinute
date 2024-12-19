export const getRandomInt = (min: number, max: number): number => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; 
}

export const getSubtractionInt = (min: number, max: number): number => {
    const weightedArray: number[] = []
    let count = 1;
    for (let i = min; i <= max; i++) {
        for (let j = 0; j < count; j++) {
            weightedArray.push(i);
        }
        count++;
    }
    const index = Math.floor(Math.random() * weightedArray.length);
    return weightedArray[index]
}

export const getFirstDivisionInt = (min: number, max: number): number => {
    const weightedArray: number[] = []
    for (let i = min; i <= max; i++) {
        if (i < 1) {
            continue
        }
        for (let j = min; j <= max; j++) {
            if (j < 1) {
                continue
            }
            if (i % j === 0) {
                weightedArray.push(i);
            }
        }
    }
    const index = Math.floor(Math.random() * weightedArray.length);
    return weightedArray[index]
}

export const getSecondDivisionInt = (min: number, max: number): number => {
    const validValues: number[] = []
    for (let i = min; i <= max; i++) {
        if (i === 0) {
            continue
        }
        if (max % i === 0) {
            validValues.push(i);
        }
    }
    const index = Math.floor(Math.random() * validValues.length);
    return validValues[index]
}