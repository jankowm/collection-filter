# collection-filter
Comparison of objects collection filtering methods

## How to use
 * generate data collection
   ```
   node generator.js [number_of_entries || 10000]
   ```
 * run filter scenarios
   ```
   node filter.js [number_of_entries || 10000]
   ```
   
## Metody filtrowania
 * `intersection` - z indeksów filtrów odczytujemy tablice id-ków. Potem przechodzimy przez te tablicy i zapisujemy częstotliwość występowania id-ków. Na koniec zostają tylko te id-ki, które występują we wszystkich tablicach.
 * `iterative-collection` - w celu redukcji liczby iteracji najpierw sprawdzamy, który ze zbiorów id-ków jest najmniejszy. Przyjmujemy go jako zbiór wyjściowy. Dla wszystkich id-ków ładujemy pełne dane obiektów. Potem iterujemy po zbiorze i sprawdzamy czy obiekty spełniają warunki pozostałych filtrów. Za kazdym razem zbiór się stopniowo zmniejsza.
 * `iterative-index` - założenie takie samo jak przy `-collection`. Różni się tylko sposobem filtrowania zbioru id-ków na kolejnych poziomach. Zamiast ładować pełne dane obiektów i porównywać je z wartościami filtrów (duplikacja logiki filtrowania - raz dla indeksu, drugi raz podczas pobrania danych) sprawdzamy czy dany id znajduje się w zbiorze odpowiedniego filtru.
Takie użycie wymaga aby zbiory filtrów były zapisane w postaci hash mapy zamiast tablicy (łatwe sprawdzenie obecności elementu). Poszczególne warianty poniżej różnia się strukturą, która przechowuje dane indeksu.
   * `iterative-index-pojo` - korzysta z prostego obiektu JS
   * `iterative-index-map` - używa `Map`
   * `iterative-index-set` - używa `Set`
 
### iterative solution vs. iterative-index-pojo/-map/-set
W iterative solution zaczynałem iterowanie od najmniejszego zbioru id-ków i stopniowo zmniejszałem jego wielkość filtrując go na kolejnych krokach.
Żeby móc przefiltrować zbiór na kolejnych krokach uznałem, że nie wystarczy mi sama informacja o id (którą dostawałem z indeksu).
Dlatego wyciągnąłem pełną informację o obiekcie i filtrowałem "na żywca", porównując parametry obiektu z wartościami kolejnych filtrów.
W ten sposób duplikowałem funkcjonalność filtrowania (a czyż informacja o wszystkich filtrowaniach nie jest zapisana już w indeksie?).

Teraz: mój błąd polegał na tym, że źle założyłem, iż muszę mieć pełną informację o obiekcie żeby móc filtrować.
Przecież informacja o tym czy dany obiekt spełnia dany filtr jest już zapisana w indeksie (z tego założenia korzysta intersekcja).
Tak więc zamiast duplikować filtrowanie na pełnym obiekcie mogę po prostu sprawdzić czy w odpowiednim indeksie znajduje się id danego obiektu.
No i teraz - jeśli wartość indeksu jest tablicą (np. `{ byStatus: { ACTIVE: [1,2,3,4,5] } }`),
to żeby znaleźć szukane id potencjalnie muszę przeszukać całą tablicę.
Ale jeśli wartość indeksu to hash mapa (`{ byStatus: { ACTIVE: {1: true,...} } }`),
to mogę błyskawicznie sprawdzić czy dany id jest w danym indeksie.

### Przykład dla metod `iterative-index-*`
**Dane wejściowe**
```js
// filter
const filter = { city: 'Wroclaw', status: 'ACTIVE', delivery: 'DPD' };

// collection
const collection = [
  { id: 1, city: 'Wroclaw', status: 'ACTIVE', delivery: 'DPD' },
  { id: 2, city: 'Wroclaw', status: 'ERROR', delivery: 'DPD' },
  // ...
];

// indexes
const indexes = {
   city: { Wroclaw: { 1: true, 2: true } },
   status: { ACTIVE: { 1: true, 4: true, 5: true } },
   delivery: { DPD: { 1: true, 2: true, 3: true, 4: true, 5: true } },
};
```
**Przebieg filtrowania**
 - poziom 0: najmniejszy zbiór jest dla filtra `'Wroclaw'`, więc od niego zaczynamy => `ids = [1, 2]`
 - poziom 1: następny mały zbiór to `'ACTIVE'`.
   Listę id filtrujemy tak, żeby zostały tylko id-ki, które są w indeksie `'ACTIVE'`. => `ids = [1]`
 - poziom 2: został ostatni, najwiekszy zbiór (`'DPD'`).
   Sprawdzamy tylko czy ostatni pozostały element (`id=1`) jest w indeksie `'DPD'` (jest) => `ids = [1]`

## Wyniki
![image](https://user-images.githubusercontent.com/93375448/222936220-65254207-3a21-4216-9ffb-949ec503e879.png)

### Wnioseczki
- szukanie klucza w hash mapie stworzonej ze zwykłego obiektu jest dużo gorsze niż przy użyciu Map/Set
  (czyt. `obj[key]` jest wolniejsze niż `map.has(key)`)
- multiple choice filters - merdżowanie zbiorów wartości to czasochłonny proces (np. Map/Set dużo traciły na tym do iterative-collection).
  Zamiast merdżowania przechowuję listę map i sprawdzam w każdej z nich. Kod jest brzydszy, ale bez tego wydajność spada tragicznie.
  Może pomogłoby to również w przypadku intersekcji (nie zaimplementowałem w ten sposób).
- ten pierwotny sposób `iterative-collection` wcale nie był taki zły jak myślałem.
  Ciągle był na czele i próbowałem pozostałymi rozwiązaniami do niego dorównać.
  Teraz Map/Set są porównywalne, a nawet czasem lepsze.
