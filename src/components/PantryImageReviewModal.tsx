import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrashIcon, XIcon } from 'lucide-react';
import {
  pantryVisionApi,
  type RecognizedPantryItem,
} from '../api/pantryVision';
import { usePantry } from '../contexts/pantryContext';

export type PantryImageReviewModalProps = {
  open: boolean;
  items: RecognizedPantryItem[];
  imagePreviewUrl?: string | null;
  emptyMessage?: string | null;
  onClose: () => void;
  onApplied?: () => void;
};

type DraftRow = RecognizedPantryItem & { key: string };

export function PantryImageReviewModal({
  open,
  items,
  imagePreviewUrl,
  emptyMessage,
  onClose,
  onApplied,
}: PantryImageReviewModalProps) {
  const { t } = useTranslation();
  const { fetchAllPantryItems } = usePantry();
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setRows(
      items.map((item, index) => ({
        ...item,
        key: `${item.name}-${index}`,
      })),
    );
  }, [open, items]);

  const validRows = useMemo(
    () => rows.filter((row) => row.name.trim().length > 0),
    [rows],
  );
  const canConfirm = validRows.length > 0 && !saving;

  if (!open) return null;

  const updateRow = (key: string, patch: Partial<RecognizedPantryItem>) => {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSaving(true);
    setError(null);
    try {
      const payload = validRows.map(({ category, name, quantity, unit }) => ({
        category: category || 'other',
        name: name.trim(),
        quantity: Number(quantity) || 0,
        unit: unit?.trim() || 'pcs',
      }));
      const res = await pantryVisionApi.apply(payload);
      if (!res.success) {
        setError(res.message || t('pantryVision.errorApply'));
        return;
      }
      await fetchAllPantryItems({ force: true });
      onApplied?.();
      onClose();
    } catch {
      setError(t('pantryVision.errorApply'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('pantryVision.reviewTitle')}
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl sm:rounded-2xl bg-linen shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-lg font-medium text-ink">
            {t('pantryVision.reviewTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-2 text-muted hover:bg-sage/60"
            aria-label={t('common.close')}
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt=""
              className="h-40 w-full rounded-xl object-cover bg-surface"
            />
          ) : null}

          <p className="text-sm text-muted">{t('pantryVision.approxHint')}</p>

          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          {rows.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-6 text-center text-muted">
              {emptyMessage || t('pantryVision.empty')}
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.key}
                className="rounded-xl border border-line bg-surface p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    value={row.category}
                    onChange={(e) =>
                      updateRow(row.key, { category: e.target.value })
                    }
                    placeholder={t('pantryVision.category')}
                    className="flex-1 border-0 bg-transparent text-sm text-muted focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="rounded-full p-1.5 text-muted hover:bg-sage/60"
                    aria-label={t('common.delete')}
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
                <input
                  value={row.name}
                  onChange={(e) => updateRow(row.key, { name: e.target.value })}
                  placeholder={t('pantryVision.name')}
                  className="w-full border-b border-line bg-transparent pb-1 font-medium text-ink focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={row.quantity}
                    onChange={(e) =>
                      updateRow(row.key, {
                        quantity: Number(e.target.value) || 0,
                      })
                    }
                    placeholder={t('pantry.quantity')}
                    className="w-1/3 rounded-lg border border-line px-3 py-2 bg-linen"
                  />
                  <input
                    value={row.unit}
                    onChange={(e) =>
                      updateRow(row.key, { unit: e.target.value })
                    }
                    placeholder={t('pantry.unit')}
                    className="w-2/3 rounded-lg border border-line px-3 py-2 bg-linen"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-3 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-line bg-surface py-3 text-ink"
          >
            {t('pantryVision.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={!canConfirm}
            className={`flex-1 rounded-xl py-3 font-medium ${
              canConfirm
                ? 'bg-herb text-white hover:bg-herb-deep'
                : 'bg-sage text-muted'
            }`}
          >
            {saving ? t('common.saving') : t('pantryVision.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
