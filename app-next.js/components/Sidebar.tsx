'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Monitor,
  LayoutGrid,
  Palette,
  Tag,
  Type,
  Globe,
  Package,
  MessageSquare,
  ShoppingCart,
  Mail,
  ChevronDown,
  ChevronRight,
  FileText,
  Settings,
  Home
} from 'lucide-react';
import { MenuItem } from '../types';

interface SidebarProps {
  activePage: string;
  onNavigate: (pageId: string) => void;
  isOpen: boolean;
}

const menuItems: any[] = [
  {
    id: 'overview',
    label: 'OVERVIEW',
    type: 'section',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    id: 'ecommerce',
    label: 'E-COMMERCE',
    type: 'section',
    items: [
      {
        id: 'orders',
        label: 'Orders',
        icon: ShoppingCart,
        subItems: [
          { id: 'orders-all', label: 'All Orders' },
          { id: 'orders-sales', label: 'Sales' },
          { id: 'orders-pending', label: 'Pending' },
          { id: 'orders-refund', label: 'Refunds' }
        ]
      },
      { id: 'products', label: 'Products', icon: Package },
      { id: 'attributes', label: 'Attributes', icon: Tag },
      {
        id: 'category',
        label: 'Categories',
        icon: LayoutGrid,
        subItems: [
          { id: 'main-category', label: 'Main Categories' },
          { id: 'sub-category', label: 'Sub Categories' }
        ]
      },
      { id: 'customer', label: 'Customers', icon: Users },
    ]
  },
  {
    id: 'content',
    label: 'SITE CONTENT',
    type: 'section',
    items: [
      { id: 'settings-home', label: 'Home Sections', icon: Home },
      { id: 'hero-slider', label: 'Hero Slider', icon: Monitor },
      { id: 'promotional-slider', label: 'Promo Slider', icon: Tag },
      { id: 'hero-features', label: 'Features', icon: FileText },
      {
        id: 'pages',
        label: 'Dynamic Pages',
        icon: Globe,
        subItems: [
          { id: 'settings-about', label: 'About Page' },
          { id: 'settings-contact', label: 'Contact Details' },
          { id: 'settings-social', label: 'Social Settings' }
        ]
      },
      { id: 'reviews', label: 'Reviews', icon: MessageSquare },
    ]
  },
  {
    id: 'customization',
    label: 'BRAND HUB',
    type: 'section',
    items: [
      { id: 'settings-branding', label: 'Logo & Identity', icon: Settings },
      { id: 'taglines', label: 'Headlines & SEO', icon: Tag },
    ]
  },
  {
    id: 'inbox',
    label: 'MESSAGES',
    type: 'section',
    items: [
      { id: 'contact', label: 'Inquiry Inbox', icon: Mail },
    ]
  }
];

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, isOpen }) => {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['orders', 'category', 'sliders']); // Default expanded for demo

  const toggleSubmenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onNavigate(activePage)} // Effectively close when clicking backdrop if parent handles it
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9999] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 text-gray-700 transition-all duration-300 overflow-y-auto custom-scrollbar z-[10000] ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'}`}>
        <nav className="py-4 space-y-8">
          {menuItems.map((section) => (
            <div key={section.id} className="px-6">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 pl-2">
                {section.label}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item: any) => {
                  const isActive = activePage === item.id || item.subItems?.some((sub: any) => sub.id === activePage);
                  const isExpanded = expandedMenus.includes(item.id);

                  return (
                    <li key={item.id}>
                      <div
                        className={`
                          flex items-center justify-between px-3 py-2.5 cursor-pointer rounded-lg transition-all duration-200
                          ${isActive ? 'bg-luxury-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 hover:text-luxury-black'}
                        `}
                        onClick={() => {
                          if (item.subItems) {
                            toggleSubmenu(item.id);
                          } else {
                            onNavigate(item.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                          <span className={`text-[13px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                        </div>
                        {item.subItems && (
                          <div className={isActive ? 'text-white' : 'text-gray-400'}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                        )}
                      </div>

                      {/* Submenu */}
                      {item.subItems && isExpanded && (
                        <ul className="mt-1 ml-4 border-l border-gray-100 pl-4 space-y-1">
                          {item.subItems.map((sub: any) => (
                            <li key={sub.id}>
                              <div
                                className={`
                                  py-2 px-3 text-[12px] cursor-pointer rounded-md transition-all
                                  ${activePage === sub.id ? 'text-luxury-black font-bold bg-gray-50' : 'text-gray-400 hover:text-luxury-black hover:bg-gray-50'}
                                `}
                                onClick={() => onNavigate(sub.id)}
                              >
                                {sub.label}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
