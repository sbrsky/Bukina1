/**
 * NextSlotChip — oat slip, −1.5°, «Ближайшее окно: {чт, 9 окт} · {14:00}» → /booking
 * (DESIGN.md §5.2.2). PAGE-A-owned.
 *
 * The box height is reserved before the slot arrives (no CLS); the content fades in (0.2 s).
 * No slot / fetch error → «Онлайн-запись · выберите удобное время». Data: useNextSlot() (read-only).
 */
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useT } from '../../../hooks/useT';
import { useLang } from '../../../context/LangContext';
import { useNextSlot } from '../lib/useNextSlot';
import './NextSlotChip.css';

export interface NextSlotChipProps {
  className?: string;
}

export default function NextSlotChip({ className }: NextSlotChipProps) {
  const t = useT();
  const { lang } = useLang();
  const { status, slot } = useNextSlot(lang);

  return (
    <div className={['v2-slot', className].filter(Boolean).join(' ')}>
      {status !== 'loading' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <Link
            to="/booking"
            className="v2-slip v2-slip--oat v2-tilt v2-slot__chip"
            style={{ '--tilt': -1.5 } as CSSProperties}
          >
            <span className="v2-slot__dot" aria-hidden="true" />
            {status === 'ready' && slot ? (
              <span>
                <span className="v2-slot__label">{t('v2.cover.nextSlot')}</span>{' '}
                <span className="v2-slot__value">
                  {slot.dateLabel} · {slot.time}
                </span>
              </span>
            ) : (
              <span className="v2-slot__value">{t('v2.cover.nextSlotNone')}</span>
            )}
          </Link>
        </motion.div>
      )}
    </div>
  );
}
