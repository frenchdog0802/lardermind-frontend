import { useState, useEffect, useMemo } from 'react';
import { IngredientEntry } from '../api/types';
import { isAscii } from '../utils/isAscii';

const useSearchIngredients = (
    searchTerm: string,
    ingredients: IngredientEntry[]
) => {
    const [filteredIngredients, setFilteredIngredients] = useState<IngredientEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const allIngredients = useMemo(() => {
        return ingredients.map((i: IngredientEntry) => ({
            id: i.id,
            name: i.name,
            default_unit: i.default_display_unit || i.default_unit || i.base_unit || '',
            unit_kind: i.unit_kind,
            base_unit: i.base_unit,
            default_display_unit: i.default_display_unit,
            kind_locked: i.kind_locked,
        }));
    }, [ingredients]);

    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredIngredients([]);
            setLoading(false);
            return;
        }

        const delayDebounce = setTimeout(() => {
            setLoading(true);
            try {
                const filtered = allIngredients
                    .filter((i: IngredientEntry) => {
                        const query = searchTerm.toLowerCase().trim();
                        const isEnglish = isAscii(i.name);
                        const nameLower = i.name.toLowerCase();
                        return isEnglish
                            ? nameLower.includes(query)
                            : i.name.includes(searchTerm);
                    })
                    .slice(0, 10);

                const seenNames = new Set<string>();
                const uniqueFiltered = filtered.filter(item => {
                    const lowerName = item.name.toLowerCase();
                    if (seenNames.has(lowerName)) return false;
                    seenNames.add(lowerName);
                    return true;
                });

                setFilteredIngredients(uniqueFiltered);
            } catch (err) {
                console.error('Error filtering ingredients:', err);
                setFilteredIngredients([]);
            } finally {
                setLoading(false);
            }
        }, 200);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm, allIngredients]);

    return { filteredIngredients, loading };
};

export default useSearchIngredients;
