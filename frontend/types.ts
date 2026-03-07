import React from 'react';
import { LucideIcon } from "lucide-react";

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  subItems?: SubMenuItem[];
}

export interface SubMenuItem {
  id: string;
  label: string;
}

export interface DashboardStat {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

export interface TableColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface Product {
  id: string | number;
  _id?: string;
  photo: string;
  photos?: string[];
  hoverImage?: string;
  name: string;
  mainCategory: string;
  subCategory: string;
  styleCode: string;
  color: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  description: string;
  materialCare: string;
  sizes?: string[];
  variants?: {
    size: string;
    quantity: number;
  }[];
  colors?: string[];
  patternType?: string;
  fabric?: string;
  collar?: string;
  sleeve?: string;
  neck?: string;
  pocket?: string;
  length?: string;
  chest?: string;
  waist?: string;
  shoulder?: string;
  sleeveLength?: string;
  siblings?: Product[];
  isNewArrival?: boolean;
  isTrending?: boolean;
  tags?: string[];
  videoUrl?: string;
  colorHex?: string;
  status: 'Active' | 'Inactive' | 'ACTIVE' | 'INACTIVE';
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Order {
  id: string | number;
  orderId: string;
  waybill: string;
  customer: string;
  email: string;
  phone: string;
  method: string;
  total: string;
  status: 'Cancelled' | 'Pending' | 'Delivered' | 'Refunded';
}

export interface Color {
  id: string | number;
  name: string;
  hex: string;
  status: 'Active' | 'Inactive';
}

export interface ContactMessage {
  id: string | number;
  name: string;
  email: string;
  message: string;
  date: string;
  status: 'Unread' | 'Read' | 'UNREAD' | 'READ';
}

export interface Review {
  id: string | number;
  productId: string | number;
  productName: string;
  productPhoto: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  status: 'Active' | 'Inactive' | 'ACTIVE' | 'INACTIVE';
  reviewText: string;
  photos?: string[];
  homepageVisible: boolean;
  date: string;
}

export interface Address {
  id?: string | number;
  label: string; // e.g., 'Home', 'Office'
  street: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export interface Customer {
  id: string | number;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  phone: string;
  ordersCount: number;
  joinedDate: string;
  addresses?: Address[];
  role?: 'CUSTOMER' | 'ADMIN';
}

export interface Slider {
  id: string | number;
  type: 'PROMOTIONAL' | 'MARQUEE' | 'CATEGORY' | 'BEST_CATEGORY' | 'NEW_ARRIVAL';
  image: string;
  title: string;
  link: string;
  status: 'Active' | 'Inactive';
}

export interface Category {
  id: string | number;
  name: string;
  slug: string;
  image?: string;
  parentId?: string | number; // Match backend parentId
  parentCategory?: string;
  description?: string;
  status: 'Active' | 'Inactive' | 'ACTIVE' | 'INACTIVE';
}


export interface AboutPageContent {
  id: string;
  heroTagline: string;
  heroTitle: string;
  heroImage: string;
  visionTagline: string;
  visionTitle: string;
  visionDescription1: string;
  visionDescription2: string;
  visionImage: string;
  visionArchiveText: string;
  values: {
    title: string;
    description: string;
  }[];
  footerImage: string;
}

export interface PromotionalSlide {
  id: string | number;
  image: string;
  title: string;
  subtitle: string;
  link: string;
  buttonText: string;
}

export interface HomeSectionContent {
  id: string;
  categoriesTitle: string;
  featuredTagline: string;
  featuredTitle: string;
  featuredLinkText: string;
  featuredButtonText: string;
  commitmentAboutLinkText: string;
  commitmentJournalLinkText: string;
  sectionOrder: string[];
  categoryColumns: number;
  trendingProductIds: (string | number)[];
  promotionalSliders: PromotionalSlide[];
  promotionalBanner: {
    isVisible: boolean;
    title: string;
    subtitle: string;
    image: string;
    link: string;
    buttonText: string;
  };
  newStandard?: {
    isVisible: boolean;
    tagline: string;
    title: string;
    description: string;
    image?: string;
    link: string;
    buttonText: string;
  };
  categories: {
    title: string;
    image: string;
    link: string;
  }[];
}

export interface Tagline {
  id: string | number;
  text: string;
  status: 'Active' | 'Inactive';
}

export interface BestsellerHeading {
  id: string | number;
  heading: string;
  status: 'Active' | 'Inactive';
}

export interface Logo {
  id: string | number;
  image: string;
  location: 'Header' | 'Footer' | 'Invoice';
  status: 'Active' | 'Inactive';
}

export interface SiteSettings {
  id: string;
  logoText: string;
  logoSubtext: string;
  logoImage?: string;
  email: string;
  phone: string;
  address: string;
  instagram: string;
  twitter: string;
  facebook: string;
  youtube: string;
  slogan: string;
  copyright: string;
  storeHours: string;
  gridSettings: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export interface HeroContent {
  id: string;
  videoUrl: string;
  tagline: string;
  title: string;
  description: string;
  primaryBtnText: string;
  secondaryBtnText: string;
}

export interface FeatureItem {
  id: string | number;
  icon: string; // Icon name from lucide
  title: string;
  description: string;
}

export interface CommitmentContent {
  id: string;
  tagline: string;
  title: string;
  description: string;
}

export interface StaticPage {
  id: string;
  title: string;
  content: string;
  lastUpdated: string;
}

export interface MarqueeItem {
  id: string | number;
  text: string;
}

export interface JournalPost {
  id: string | number;
  title: string;
  category: string;
  image: string;
  excerpt: string;
  date: string;
}

export interface SocialPost {
  id: string | number;
  image: string;
  likes: string;
  caption: string;
}


export interface LookbookItem {
  id: string | number;
  image: string;
  caption: string;
  colSpan?: number; // for masonry layout
}

export interface HeroSlide {
  id: string | number;
  type: 'image' | 'video';
  url: string;
  tagline: string;
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  duration?: number;
  order: number;
  status: 'Active' | 'Inactive';
}

export interface IMedia {
  id: string;
  url: string;
  fileId: string;
  name: string;
  size?: number;
  mimeType?: string;
  folder?: string;
  createdAt: string;
}
