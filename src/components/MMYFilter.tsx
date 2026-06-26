'use client';

import { useState } from 'react';

interface MMYFilterProps {
  onYearChange: (year: string) => void;
}

const mustangYears = [
  '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015',
  '2014', '2013', '2012', '2011', '2010', '2009', '2008', '2007', '2006', '2005',
  '2004', '2003', '2002', '2001', '2000', '1999', '1998', '1997', '1996', '1995', '1994',
  '1993', '1992', '1991', '1990', '1989', '1988', '1987', '1986', '1985', '1984', '1983', '1982', '1981', '1980', '1979',
];

export default function MMYFilter({ onYearChange }: MMYFilterProps) {
  const [selected, setSelected] = useState('');

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <select
        className="border-2 border-gray-200 rounded-lg px-4 py-3 bg-white focus:border-red-600 focus:outline-none"
        value={selected}
        onChange={e => { setSelected(e.target.value); onYearChange(e.target.value); }}
      >
        <option value="">Select Year</option>
        {mustangYears.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
