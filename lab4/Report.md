## Lab4. Визначити вірогідність появи конфліктних призначень при зміні заповненості матриці         "1" зв'язності від 1% до 100% для заданої розмірності від 10 до 30 з кроком 5

#### Теоретичні відомості і опис алгоритму

Загальна робота:

1. Матриця передається у алгоритм
2. Знаходяться конфліктні призначення: 
    1. Від усіх значень у матриці віднімається мінімальне для даного рядку
    2. Від усіх значень у матриці віднімається мінімальне у даній колонці
    3. Перевіряється наявність конфліктних призначень: якщо є рядки або колонки, в яких єдиний нуль має однакову координату х або у, це конфліктне призначення 
    4. Кількість конфліктних призначень повертається як результат 
3. Щоб знайти імовірність, для кожної розмірності від 10 до 30 з кроком 5 генерується 200 матриць, для них обчислюється середнє значення конфліктів на розмір матриці      

#### Лістинг основної частини програми.

   
    generateMatrix(size: number); // генерує матрицю заданої розмірності
    reduceRowsByMin(m: Matrix); // віднімає від кожного значення матриці мінімальне значення в цьому рядку   
    reduceColsByMin(m: Matrix); // віднімає від кожного значення матриці мінімальне значення в цій колонці
    getConflict(matrix: Matrix); // знаходить конфліктні призначення і повертає їх у вигляді масиву   


#### Визначення часової складності алгоритму

O(n) = n