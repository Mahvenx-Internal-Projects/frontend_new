// ─── Drop this component into OrgSettingsPage.tsx (Content tab) ──────────────
// Renders a visual gallery of templates for About Us / Contact Us with a
// live mini-preview of each style, plus the logo placement toggle.

import { Check } from 'lucide-react';
import clsx from 'clsx';

const ABOUT_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic Centered',
    desc: 'Logo on top, centered text, simple and clean',
    preview: (primary: string) => (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3 bg-white">
        <div className="w-6 h-6 rounded-lg" style={{ background: primary }}/>
        <div className="w-16 h-1.5 rounded bg-gray-300 mt-1"/>
        <div className="w-20 h-1 rounded bg-gray-200"/>
        <div className="w-20 h-1 rounded bg-gray-200"/>
        <div className="w-14 h-1 rounded bg-gray-200"/>
      </div>
    ),
  },
  {
    id: 'split',
    name: 'Split Layout',
    desc: 'Logo & image on one side, story text on the other',
    preview: (primary: string) => (
      <div className="w-full h-full flex gap-1.5 p-3 bg-white">
        <div className="w-1/3 rounded-lg flex items-center justify-center" style={{ background: `${primary}20` }}>
          <div className="w-5 h-5 rounded" style={{ background: primary }}/>
        </div>
        <div className="flex-1 flex flex-col gap-1.5 justify-center">
          <div className="w-full h-1.5 rounded bg-gray-300"/>
          <div className="w-full h-1 rounded bg-gray-200"/>
          <div className="w-3/4 h-1 rounded bg-gray-200"/>
        </div>
      </div>
    ),
  },
  {
    id: 'timeline',
    name: 'Timeline / Journey',
    desc: 'Vertical timeline showing milestones & growth',
    preview: (primary: string) => (
      <div className="w-full h-full flex flex-col gap-1.5 p-3 bg-white justify-center">
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: primary }}/>
            <div className="flex-1 h-1 rounded bg-gray-200"/>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'card',
    name: 'Stat Cards',
    desc: 'About text + grid of achievement/stat cards',
    preview: (primary: string) => (
      <div className="w-full h-full flex flex-col gap-1.5 p-3 bg-white">
        <div className="w-full h-1.5 rounded bg-gray-300"/>
        <div className="flex gap-1 mt-1">
          {[0,1,2].map(i => (
            <div key={i} className="flex-1 h-6 rounded" style={{ background: `${primary}15`, border: `1px solid ${primary}40` }}/>
          ))}
        </div>
      </div>
    ),
  },
];

const CONTACT_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic Cards + Form',
    desc: 'Info cards on left, enquiry form on right',
    preview: (primary: string) => (
      <div className="w-full h-full flex gap-1.5 p-3 bg-white">
        <div className="flex-1 flex flex-col gap-1">
          {[0,1,2].map(i => <div key={i} className="h-3 rounded" style={{ background: `${primary}15` }}/>)}
        </div>
        <div className="flex-1 rounded-lg p-1.5 flex flex-col gap-1" style={{ background: `${primary}08`, border: `1px solid ${primary}30` }}>
          <div className="w-full h-1 rounded bg-gray-300"/>
          <div className="w-full h-1 rounded bg-gray-300"/>
          <div className="w-full h-2 rounded bg-gray-300"/>
        </div>
      </div>
    ),
  },
  {
    id: 'split',
    name: 'Map-Side Split',
    desc: 'Map on one side, contact details + form stacked on other',
    preview: (primary: string) => (
      <div className="w-full h-full flex gap-1.5 p-3 bg-white">
        <div className="w-1/2 rounded-lg" style={{ background: `${primary}15` }}/>
        <div className="flex-1 flex flex-col gap-1 justify-center">
          <div className="w-full h-1 rounded bg-gray-300"/>
          <div className="w-full h-1 rounded bg-gray-200"/>
          <div className="w-3/4 h-1 rounded bg-gray-200"/>
        </div>
      </div>
    ),
  },
  {
    id: 'minimal',
    name: 'Minimal Centered',
    desc: 'Just essential contact info, centered, no form',
    preview: (primary: string) => (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-3 bg-white">
        <div className="w-4 h-4 rounded-full" style={{ background: primary }}/>
        <div className="w-16 h-1 rounded bg-gray-300"/>
        <div className="w-12 h-1 rounded bg-gray-200"/>
      </div>
    ),
  },
  {
    id: 'map-focus',
    name: 'Map Focused',
    desc: 'Large map banner with floating contact card overlay',
    preview: (primary: string) => (
      <div className="w-full h-full relative p-1.5 bg-white">
        <div className="w-full h-full rounded-lg" style={{ background: `${primary}20` }}/>
        <div className="absolute bottom-2 left-2 right-2 h-6 rounded bg-white shadow-sm border border-gray-200"/>
      </div>
    ),
  },
];

function TemplateGallery({
  templates, selected, onSelect, primary,
}: { templates: typeof ABOUT_TEMPLATES; selected: string; onSelect: (id: string) => void; primary: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {templates.map(t => {
        const isSelected = selected === t.id;
        return (
          <button key={t.id} onClick={() => onSelect(t.id)}
            className={clsx('relative rounded-xl border-2 overflow-hidden transition-all text-left group',
              isSelected ? 'border-[var(--org-primary)] shadow-md' : 'border-gray-200 hover:border-gray-300')}>
            <div className="h-20 bg-gray-50">{t.preview(primary)}</div>
            <div className="p-2 bg-white">
              <p className="text-xs font-bold text-gray-800 truncate">{t.name}</p>
              <p className="text-[10px] text-gray-400 line-clamp-1">{t.desc}</p>
            </div>
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                style={{ background: primary }}>
                <Check className="w-3 h-3"/>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Export both galleries + the logo toggle for use in OrgSettingsPage ──────
export function AboutUsTemplatePicker({ value, onChange, primary }: { value: string; onChange: (v: string) => void; primary: string }) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-bold text-gray-900 text-sm">About Us — Page Design</h4>
        <p className="text-xs text-gray-500">Pick a layout style for your About Us section</p>
      </div>
      <TemplateGallery templates={ABOUT_TEMPLATES} selected={value} onSelect={onChange} primary={primary}/>
    </div>
  );
}

export function ContactUsTemplatePicker({ value, onChange, primary }: { value: string; onChange: (v: string) => void; primary: string }) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-bold text-gray-900 text-sm">Contact Us — Page Design</h4>
        <p className="text-xs text-gray-500">Pick a layout style for your Contact Us section</p>
      </div>
      <TemplateGallery templates={CONTACT_TEMPLATES} selected={value} onSelect={onChange} primary={primary}/>
    </div>
  );
}
