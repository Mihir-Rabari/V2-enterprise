import React, { useState } from 'react';
import { useAdminData } from '../hooks/useAdminData';
import { sliderAPI, settingsAPI, contentAPI, categoriesAPI, productsAPI, reviewsAPI, contactsAPI } from '../lib/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu,
    ChevronDown,
    ChevronUp,
    Package,
    ShoppingCart,
    MessageSquare,
    Users,
    Eye,
    Trash2,
    Edit,
    Power,
    LogOut,
    Store,
    Check,
    Plus,
    FileText,
    LayoutDashboard,
    Settings,
    Globe,
    Monitor,
    Type,
    ChevronRight,
    Mail,
    LayoutGrid,
    Tag,
    Star,
    Sparkles,
    PlusCircle,
    Copy,
    Save,
    ChevronLeft // Added ChevronLeft
} from 'lucide-react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    BarChart,
    Bar
} from 'recharts';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import DataTable from './DataTable';
import StatsCard from './StatsCard';
import Modal from './Modal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import DashboardPage from './admin/DashboardPage';
import { SocialSettingsPage, ContactDetailsPage, AboutSettingsPage } from './admin/SettingsPages';
import { StatusBadge, ActionButtons } from './admin/AdminHelpers';
import { ImageUploader } from './admin/ImageUploader';
import OrderDetailsModal from './OrderDetailsModal';

import {
    Product,
    Order,
    Color,
    ContactMessage,
    Review,
    Customer,
    Slider,
    Category,
    Tagline,
    BestsellerHeading,
    Logo,
    TableColumn,
    StaticPage,
    SiteSettings,
    HeroContent,
    FeatureItem,
    CommitmentContent,
    AboutPageContent,
    HomeSectionContent,
    HeroSlide,
    SocialPost,
    LookbookItem
} from '../types';
import {
    initialColors,
    initialRefundOrders,
    initialSliders,
    initialMainCategories,
    initialSubCategories,
    initialTaglines,
    initialBestsellers,
    initialLogos,
    initialPages,
    initialSiteSettings,
    initialHeroContent,
    initialFeatures,
    initialCommitment,
    initialAboutContent,
    initialHomeSections,
    initialHeroSlides
} from '../data/initialData';

// Initial data moved to ../data/initialData.ts

// --- ADMIN DASHBOARD ---

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activePage = searchParams.get('page') || 'dashboard';
    const setActivePage = (page: string) => setSearchParams({ page }, { replace: false });
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [mounted, setMounted] = useState(false);
    const [chartsMounted, setChartsMounted] = useState(false);

    // --- LIVE API DATA ---
    const {
        stats: apiStats, products: apiProducts, orders: apiOrders,
        reviews: apiReviews, contacts: apiContacts, customers: customerDataFromHook,
        loading, error,
        fetchStats, fetchProducts, fetchOrders, fetchCustomers, fetchAllBase,
        productPagination, orderPagination, customerPagination,
        deleteProduct: apiDeleteProduct, toggleProductField, updateOrderStatus,
        updateReview, deleteReview: apiDeleteReview, markContactRead,
        createHero, updateHero, deleteHero,
        createPromo, updatePromo, deletePromo,
        createContent, updateContent, deleteContent, fetchContent,
        setProducts: setApiProducts, setOrders: setApiOrders,
        setReviews, setContacts
    } = useAdminData();

    React.useEffect(() => {
        setMounted(true);
        const timer = setTimeout(() => {
            setChartsMounted(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // --- API-BACKED STATE ---
    const [taglines, setTaglines] = useState<Tagline[]>([]);
    const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
    const [lookbookItems, setLookbookItems] = useState<LookbookItem[]>([]);
    const [mainSliders, setMainSliders] = useState<Slider[]>([]); // Using promotional slider routes
    const [categorySliders, setCategorySliders] = useState<Slider[]>([]);
    const [bestCategorySliders, setBestCategorySliders] = useState<Slider[]>([]);
    const [newArrivalSliders, setNewArrivalSliders] = useState<Slider[]>([]);
    const [mainCategories, setMainCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<Category[]>([]);
    const [bestsellers, setBestsellers] = useState<BestsellerHeading[]>([]);
    const [logos, setLogos] = useState<Logo[]>([]);
    const [pages, setPages] = useState<StaticPage[]>([]);
    const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
    const [heroContent, setHeroContent] = useState<HeroContent>(initialHeroContent);
    const [features, setFeatures] = useState<FeatureItem[]>(initialFeatures);
    const [commitment, setCommitment] = useState<CommitmentContent>(initialCommitment);
    const [aboutContent, setAboutContent] = useState<AboutPageContent>(initialAboutContent);
    const [homeSections, setHomeSections] = useState<HomeSectionContent>(initialHomeSections);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSiteSettings);
    const [waybillData, setWaybillData] = useState<Record<string, { awbNumber: string; trackingLink: string }>>({});

    // Sync waybillData with apiOrders
    React.useEffect(() => {
        if (apiOrders.length > 0) {
            const newData = { ...waybillData };
            apiOrders.forEach(order => {
                if (!newData[order.id]) {
                    newData[order.id] = {
                        awbNumber: order.awbNumber || '',
                        trackingLink: order.trackingLink || ''
                    };
                }
            });
            setWaybillData(newData);
        }
    }, [apiOrders]);

    const products = apiProducts;
    const orders = apiOrders;
    const reviews = apiReviews;
    const contacts = apiContacts;
    const customers = customerDataFromHook;

    // Initial Fetch for Content & Settings
    React.useEffect(() => {
        const loadExtraData = async () => {
            try {
                const [tagRes, socialRes, lookRes, heroRes, promoRes, settingsRes, catRes, logoRes, bestRes, pageRes, featRes] = await Promise.all([
                    fetchContent('TAGLINE'),
                    fetchContent('SOCIAL_POST'),
                    fetchContent('LOOKBOOK_ITEM'),
                    sliderAPI.getHero(),
                    sliderAPI.getPromotional(),
                    settingsAPI.get(),
                    categoriesAPI.getAll(),
                    fetchContent('LOGO'),
                    fetchContent('BESTSELLER_HEADING'),
                    fetchContent('PAGE'),
                    fetchContent('FEATURE_ITEM'),
                ]);

                if (tagRes.data.success) setTaglines(tagRes.data.data);
                if (socialRes.data.success) setSocialPosts(socialRes.data.data);
                if (lookRes.data.success) setLookbookItems(lookRes.data.data);
                if (heroRes.data.success) setHeroSlides(heroRes.data.data);
                if (promoRes.data.success) {
                    const allPromo = promoRes.data.data as Slider[];
                    setMainSliders(allPromo.filter(s => s.type === 'PROMOTIONAL'));
                    setCategorySliders(allPromo.filter(s => s.type === 'CATEGORY'));
                    setBestCategorySliders(allPromo.filter(s => s.type === 'BEST_CATEGORY'));
                    setNewArrivalSliders(allPromo.filter(s => s.type === 'NEW_ARRIVAL'));
                }
                if (settingsRes.data.success && settingsRes.data.data) {
                    const s = settingsRes.data.data;
                    setSiteSettings(s);
                    if (s.homeSections) setHomeSections(s.homeSections);
                    if (s.aboutContent) setAboutContent(s.aboutContent);
                    if (s.commitment) setCommitment(s.commitment);
                }
                if (catRes.data.success) {
                    const allCats = catRes.data.data;
                    setMainCategories(allCats.filter((c: any) => !c.parentId && !c.parentCategory));
                    setSubCategories(allCats.filter((c: any) => c.parentId || c.parentCategory));
                }
                if (logoRes.data.success && logoRes.data.data.length > 0) setLogos(logoRes.data.data);
                if (bestRes.data.success && bestRes.data.data.length > 0) setBestsellers(bestRes.data.data);
                if (pageRes.data.success && pageRes.data.data.length > 0) setPages(pageRes.data.data);
                if (featRes.data.success && featRes.data.data.length > 0) setFeatures(featRes.data.data);

                // Load base data (reviews, contacts, stats)
                await fetchAllBase();
            } catch (err) { console.error('Error loading admin extra data:', err); }
        };
        loadExtraData();
    }, [fetchContent, fetchAllBase]);


    // --- LAZY LOADING TRIGGER ---
    React.useEffect(() => {
        // Redirection check: if no session, go to login
        if (localStorage.getItem('v2_admin_session') !== 'true' || !localStorage.getItem('v2_token')) {
            navigate('/admin/login');
            return;
        }

        if (activePage === 'products' && apiProducts.length === 0) fetchProducts(1, 15);
        if (['orders', 'orders-all', 'orders-sales', 'orders-pending', 'orders-refund'].includes(activePage) && apiOrders.length === 0) fetchOrders(1, 15);
        if (activePage === 'customer' && customerDataFromHook.length === 0) fetchCustomers(1, 15);
    }, [activePage, apiProducts.length, apiOrders.length, customerDataFromHook.length, fetchProducts, fetchOrders, fetchCustomers, navigate]);

    // --- MODAL STATE ---
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({});
    const [tempVariant, setTempVariant] = useState({ color: '', size: '', quantity: 0 });

    // Order Detail Modal State
    const [orderDetailOpen, setOrderDetailOpen] = useState(false);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

    const dashboardStats = [
        { label: 'Total Products', value: apiStats?.totalProducts ?? products.length, icon: Package },
        { label: 'Total Orders', value: apiStats?.totalOrders ?? orders.length, icon: ShoppingCart },
        { label: 'Total Contacts', value: apiStats?.totalContacts ?? contacts.length, icon: Users },
        { label: 'Total Reviews', value: apiStats?.totalReviews ?? reviews.length, icon: MessageSquare },
        { label: 'Revenue (₹)', value: apiStats?.totalRevenue ? `₹${apiStats.totalRevenue.toLocaleString()}` : '—', icon: ShoppingCart },
    ];

    // --- HANDLERS ---
    const handleAdd = (type: string) => {
        setModalType(type);
        // Set default status for relevant types to avoid uncontrolled/controlled warnings
        const defaults: any = {};
        if (['product', 'main-category', 'sub-category', 'tagline', 'socialPost', 'slider'].includes(type)) {
            defaults.status = 'ACTIVE';
        }
        setFormData(defaults);
        setModalOpen(true);
    };

    const handleEdit = (type: string, item: any) => {
        setModalType(type);
        setFormData(item);
        setModalOpen(true);
    };

    const handleDelete = async (type: string, id: any) => {
        if (!id) {
            alert('Error: Could not find item ID. Please refresh and try again.');
            return;
        }
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            switch (type) {
                case 'product':
                    await apiDeleteProduct(id);
                    break;
                case 'tagline':
                    await deleteContent(id);
                    setTaglines(prev => prev.filter(t => String(t.id) !== String(id) && String((t as any)._id) !== String(id)));
                    break;
                case 'socialPost':
                    await deleteContent(id);
                    setSocialPosts(prev => prev.filter(s => String(s.id) !== String(id) && String((s as any)._id) !== String(id)));
                    break;
                case 'lookbookItem':
                    await deleteContent(id);
                    setLookbookItems(prev => prev.filter(s => String(s.id) !== String(id) && String((s as any)._id) !== String(id)));
                    break;
                case 'slider':
                    await deletePromo(id);
                    setMainSliders(prev => prev.filter(s => String(s.id) !== String(id) && String((s as any)._id) !== String(id)));
                    break;
                case 'hero-slide':
                    await deleteHero(id);
                    setHeroSlides(prev => prev.filter(s => String((s as any).id) !== String(id) && String((s as any)._id) !== String(id)));
                    break;
                case 'category-slider':
                    await deletePromo(id);
                    setCategorySliders(prev => prev.filter(s => String(s.id) !== String(id) && String((s as any)._id) !== String(id)));
                    break;
                case 'best-category-slider':
                    await deletePromo(id);
                    setBestCategorySliders(prev => prev.filter(s => String(s.id) !== String(id) && String((s as any)._id) !== String(id)));
                    break;
                case 'new-arrival-slider':
                    await deletePromo(id);
                    setNewArrivalSliders(prev => prev.filter(s => String(s.id) !== String(id) && String((s as any)._id) !== String(id)));
                    break;
                case 'feature':
                    await deleteContent(id);
                    setFeatures(prev => prev.filter(f => String(f.id) !== String(id) && String((f as any)._id) !== String(id)));
                    break;
                case 'main-category':
                    await categoriesAPI.delete(id);
                    setMainCategories(prev => prev.filter(c => String((c as any).id) !== String(id) && String((c as any)._id) !== String(id)));
                    break;
                case 'sub-category':
                    await categoriesAPI.delete(id);
                    setSubCategories(prev => prev.filter(c => String((c as any).id) !== String(id) && String((c as any)._id) !== String(id)));
                    break;
                case 'logo':
                    await deleteContent(id);
                    setLogos(prev => prev.filter(l => String(l.id) !== String(id) && String((l as any)._id) !== String(id)));
                    break;
                case 'bestseller':
                    await deleteContent(id);
                    setBestsellers(prev => prev.filter(b => String(b.id) !== String(id) && String((b as any)._id) !== String(id)));
                    break;
                case 'page':
                    await deleteContent(id);
                    setPages(prev => prev.filter(p => String(p.id) !== String(id) && String((p as any)._id) !== String(id)));
                    break;
                case 'review':
                    await apiDeleteReview(id);
                    setReviews(prev => prev.filter(r => String(r.id) !== String(id) && String(r._id) !== String(id)));
                    break;
                case 'contact':
                    await markContactRead(id);
                    break;
                default:
                    break;
            }
        } catch (err: any) {
            console.error('Failed to delete item', err);
            const msg = err?.response?.data?.message || err?.message || 'Unknown error';
            alert(`Failed to delete: ${msg}`);
        }
    };

    const handleMoveSlide = async (id: string | number, direction: 'up' | 'down') => {
        const sorted = [...heroSlides].sort((a, b) => a.order - b.order);
        const index = sorted.findIndex(s => (s as any).id === id || (s as any)._id === id);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === sorted.length - 1) return;

        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        [sorted[index], sorted[nextIndex]] = [sorted[nextIndex], sorted[index]];

        const finalSlides = sorted.map((s, i) => ({ ...s, order: i + 1 }));
        setHeroSlides(finalSlides);

        // Persist to backend
        try {
            await Promise.all([
                updateHero((finalSlides[index] as any).id || (finalSlides[index] as any)._id, { order: finalSlides[index].order }),
                updateHero((finalSlides[nextIndex] as any).id || (finalSlides[nextIndex] as any)._id, { order: finalSlides[nextIndex].order }),
            ]);
        } catch (err) {
            console.error('Failed to persist slide order:', err);
        }
    };

    const handleMoveHomeSection = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === homeSections.sectionOrder.length - 1) return;

        const newOrder = [...homeSections.sectionOrder];
        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        [newOrder[index], newOrder[nextIndex]] = [newOrder[nextIndex], newOrder[index]];

        const updated = { ...homeSections, sectionOrder: newOrder };
        setHomeSections(updated);

        // Persist to backend
        try {
            await settingsAPI.update({ homeSections: updated });
        } catch (err) {
            console.error('Failed to save section order:', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('v2_admin_session');
        localStorage.removeItem('v2_token');
        localStorage.removeItem('v2_user');
        navigate('/admin/login');
    };


    const handleSubmit = async () => {
        if (!modalType) return;
        let finalData = formData;

        try {
            // -- API OPERATIONS --
            if (['tagline', 'socialPost', 'lookbookItem', 'logo', 'bestseller', 'page'].includes(modalType)) {
                const typeMap: Record<string, string> = {
                    'tagline': 'TAGLINE',
                    'socialPost': 'SOCIAL_POST',
                    'lookbookItem': 'LOOKBOOK_ITEM',
                    'logo': 'LOGO',
                    'bestseller': 'BESTSELLER_HEADING',
                    'page': 'PAGE',
                    'feature': 'FEATURE_ITEM'
                };
                if (formData.id || formData._id) {
                    const res = await updateContent(formData.id || formData._id, formData);
                    finalData = res.data.data;
                } else {
                    const res = await createContent({ ...formData, type: typeMap[modalType] });
                    finalData = res.data.data;
                }
            } else if (modalType === 'site-settings') {
                const res = await settingsAPI.update(formData);
                finalData = res.data.data;
            } else if (modalType === 'about-content') {
                const res = await settingsAPI.update({ aboutContent: formData });
                setAboutContent(formData);
                finalData = formData;
            } else if (modalType === 'home-sections') {
                const res = await settingsAPI.update({ homeSections: formData });
                setHomeSections(formData);
                finalData = formData;
            }
            else if (modalType === 'main-category' || modalType === 'sub-category') {
                const identifier = formData.id || formData._id;
                if (identifier) {
                    const res = await categoriesAPI.update(identifier, formData);
                    finalData = res.data.data;
                } else {
                    const parentId = modalType === 'sub-category'
                        ? mainCategories.find(c => c.name === formData.parentCategory)?.id || mainCategories.find(c => c.name === formData.parentCategory)?._id
                        : undefined;
                    const res = await categoriesAPI.create({ ...formData, parentId: parentId as any });
                    finalData = res.data.data;
                }
            } else if (modalType === 'hero-slide') {
                if (formData.id) {
                    const res = await updateHero(formData.id, formData);
                    finalData = res.data.data;
                } else {
                    const res = await createHero(formData);
                    finalData = res.data.data;
                }
            } else if (modalType === 'product') {
                // Normalize Product Data
                const normalizedData = {
                    ...formData,
                    price: parseFloat(formData.price) || 0,
                    originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined
                };
                if (normalizedData.status) normalizedData.status = normalizedData.status.toUpperCase();

                // Derive sizes array from variants
                if (normalizedData.variants && Array.isArray(normalizedData.variants)) {
                    const uniqueSizes = Array.from(new Set(normalizedData.variants.map((v: any) => v.size).filter(Boolean)));
                    normalizedData.sizes = uniqueSizes;
                }

                if (formData.id || formData._id) {
                    const res = await productsAPI.update(formData.id || formData._id, normalizedData);
                    finalData = res.data.data;
                } else {
                    const res = await productsAPI.create(normalizedData);
                    finalData = res.data.data;
                }
            } else if (['slider', 'category-slider', 'best-category-slider', 'new-arrival-slider'].includes(modalType)) {
                const typeMap: Record<string, string> = {
                    'slider': 'PROMOTIONAL',
                    'category-slider': 'CATEGORY',
                    'best-category-slider': 'BEST_CATEGORY',
                    'new-arrival-slider': 'NEW_ARRIVAL'
                };
                const sliderData = { ...formData, type: typeMap[modalType] };
                if (formData.id) {
                    const res = await updatePromo(formData.id, sliderData);
                    finalData = res.data.data;
                } else {
                    const res = await createPromo(sliderData);
                    finalData = res.data.data;
                }
            } else if (modalType === 'review') {
                if (formData.id) {
                    const res = await reviewsAPI.update(formData.id, formData);
                    finalData = res.data.data;
                }
            } else if (modalType === 'contact') {
                if (formData.id) {
                    const res = await contactsAPI.markRead(formData.id, { status: 'READ' });
                    finalData = res.data.data;
                }
            }
        } catch (error) {
            console.error("Failed to save data:", error);
            alert("Failed to save changes. Please try again.");
            return;
        }

        const typeMapping: { [key: string]: [any, any] } = {
            'tagline': [taglines, setTaglines],
            'product': [products, setApiProducts],
            'slider': [mainSliders, setMainSliders],
            'category-slider': [categorySliders, setCategorySliders],
            'best-category-slider': [bestCategorySliders, setBestCategorySliders],
            'new-arrival-slider': [newArrivalSliders, setNewArrivalSliders],
            'main-category': [mainCategories, setMainCategories],
            'sub-category': [subCategories, setSubCategories],
            'bestseller': [bestsellers, setBestsellers],
            'logo': [logos, setLogos],
            'page': [pages, setPages],
            'review': [reviews, setReviews],
            'contact': [contacts, setContacts],
            'site-settings': [siteSettings, setSiteSettings],
            'hero': [heroContent, setHeroContent],
            'feature': [features, setFeatures],
            'commitment': [commitment, setCommitment],
            'home-sections': [homeSections, setHomeSections],
            'about-content': [aboutContent, setAboutContent],
            'hero-slide': [heroSlides, setHeroSlides],
            'socialPost': [socialPosts, setSocialPosts],
            'lookbookItem': [lookbookItems, setLookbookItems],
        };

        if (typeMapping[modalType]) {
            const [data, setData] = typeMapping[modalType];

            // Handle single object states
            if (['site-settings', 'hero', 'commitment', 'home-sections', 'about-content'].includes(modalType)) {
                setData(finalData);
            } else if (modalType === 'contact' && !formData.id) {
                // Should not happen as contact is view only, but just in case
            } else if (formData.id || formData._id) {
                const fId = formData.id || formData._id;
                // If viewing a message, mark as read automatically
                const updatedData = data.map((item: any) => {
                    const itemId = item.id || item._id;
                    if (itemId === fId || itemId === finalData?.id || itemId === finalData?._id) {
                        return modalType === 'contact' ? { ...item, status: 'READ' } : { ...item, ...finalData };
                    }
                    return item;
                });
                setData(updatedData);
            } else {
                if (!finalData.id) {
                    finalData.id = modalType === 'page' ? formData.title?.toLowerCase().replace(/\s+/g, '-') : Date.now();
                }
                setData([...data, finalData]);
            }
        }
        setModalOpen(false);
    };


    // --- COLUMN DEFINITIONS ---

    const toggleTrending = (productId: string | number) => {
        setHomeSections(prev => {
            const currentTrending = prev.trendingProductIds || [];
            const isTrending = currentTrending.includes(productId);
            const newTrending = isTrending
                ? currentTrending.filter(id => id !== productId)
                : [...currentTrending, productId];
            return { ...prev, trendingProductIds: newTrending };
        });
        const product = products.find(p => p.id === productId);
        if (product) toggleProductField(productId, 'isTrending', !product.isTrending);
    };

    const handleDuplicateProduct = (row: Product) => {
        // Pre-fill form with all data from the original, but strip ID fields and clear color
        const { id, _id, ...rest } = row as any;
        setFormData({ ...rest, color: '', name: row.name });
        setModalType('product');
        setModalOpen(true);
    };

    const productColumns: TableColumn<Product>[] = [
        { header: 'Photo', accessor: (row) => <img src={row.photo} alt="Product" className="w-12 h-12 object-cover rounded border border-gray-200" /> },
        {
            header: 'Name', accessor: (row) => (
                <div className="max-w-[200px]">
                    <p className="font-medium text-slate-800 line-clamp-1">{row.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{row.mainCategory} / {row.subCategory}</p>
                        {row.color && <span className="text-[9px] font-bold uppercase tracking-widest text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">{row.color}</span>}
                    </div>
                    {row.styleCode && <p className="text-[9px] text-gray-300 font-mono mt-0.5">{row.styleCode}</p>}
                </div>
            )
        },
        { header: 'Price', accessor: (row) => <div className="flex flex-col"><span className="font-bold text-slate-800">₹{row.price}</span>{row.originalPrice && <span className="text-[10px] text-gray-400 line-through">₹{row.originalPrice}</span>}</div> },
        {
            header: 'Trending',
            accessor: (row) => (
                <button
                    onClick={() => toggleTrending(row.id || (row as any)._id)}
                    className={`p-1.5 rounded-lg transition-colors ${(homeSections.trendingProductIds || []).includes(row.id || (row as any)._id) ? 'bg-luxury-gold text-white shadow-sm shadow-luxury-gold/20' : 'bg-gray-50 text-gray-400 hover:text-luxury-black'}`}
                >
                    <Tag size={14} />
                </button>
            )
        },
        { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
        { header: 'Action', accessor: (row) => <ActionButtons onClickEdit={() => handleEdit('product', row)} onClickDelete={() => handleDelete('product', row.id || (row as any)._id)} onClickDuplicate={() => handleDuplicateProduct(row)} /> },
    ];

    const customerColumns: TableColumn<any>[] = [
        { header: 'Customer', accessor: (row: any) => <div><p className="font-bold text-slate-800">{row.name}</p><p className="text-xs text-gray-500">{row.email}</p></div> },
        { header: 'Phone', accessor: (row: any) => row.phone || '—' },
        { header: 'Orders', accessor: (row: any) => <span className="font-bold text-slate-800">{row._count?.orders ?? row.ordersCount ?? 0}</span> },
        { header: 'Role', accessor: (row: any) => <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded ${row.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>{row.role}</span> },
        { header: 'Joined', accessor: (row: any) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN') : row.joinedDate || '—' },
        { header: 'Action', accessor: (row: any) => <ActionButtons onClickDelete={() => handleDelete('customer', row.id || row._id)} /> },
    ];

    const orderColumns: TableColumn<any>[] = [
        { header: 'Order Id', accessor: (row: any) => <span className="font-mono text-[11px] font-bold text-slate-800 bg-gray-50 px-2 py-1 rounded border border-gray-100">{row.id || row.orderId}</span> },
        {
            header: 'Shipping / Waybill', accessor: (row: any) => (
                <div className="flex flex-col gap-1.5 min-w-[140px]">
                    <input
                        placeholder="AWB Number"
                        className="w-full border border-gray-100 px-2 py-1.5 text-[10px] font-bold rounded-lg focus:outline-none focus:border-luxury-gold transition-colors bg-white shadow-sm"
                        value={waybillData[row.id || row._id]?.awbNumber || ''}
                        onChange={(e) => setWaybillData({
                            ...waybillData,
                            [row.id || row._id]: { ...(waybillData[row.id || row._id] || { trackingLink: '' }), awbNumber: e.target.value }
                        })}
                    />
                    <div className="flex gap-1.5">
                        <input
                            placeholder="Tracking Link"
                            className="flex-1 border border-gray-100 px-2 py-1.5 text-[10px] font-bold rounded-lg focus:outline-none focus:border-luxury-gold transition-colors bg-white shadow-sm"
                            value={waybillData[row.id || row._id]?.trackingLink || ''}
                            onChange={(e) => setWaybillData({
                                ...waybillData,
                                [row.id || row._id]: { ...(waybillData[row.id || row._id] || { awbNumber: '' }), trackingLink: e.target.value }
                            })}
                        />
                        <button
                            onClick={async () => {
                                try {
                                    await updateOrderStatus(row.id || row._id, {
                                        awbNumber: waybillData[row.id || row._id]?.awbNumber,
                                        trackingLink: waybillData[row.id || row._id]?.trackingLink
                                    });
                                    alert('Shipping details saved!');
                                } catch (err) {
                                    alert('Failed to save shipping details');
                                }
                            }}
                            className="bg-slate-800 hover:bg-black text-white text-[9px] font-black uppercase tracking-widest px-3 rounded-lg transition-all shadow-md shadow-black/10 flex items-center justify-center p-1"
                            title="Save Shipping Info"
                        >
                            <Save size={12} />
                        </button>
                    </div>
                </div>
            )
        },
        { header: 'Customer', accessor: (row: any) => <div><p className="font-black text-slate-800 text-[13px] tracking-tight">{row.user?.name || row.customer || '—'}</p><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{row.user?.email || row.email || '—'}</p></div> },
        { header: 'Method', accessor: (row: any) => <span className="text-[10px] font-black tracking-[0.2em] text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-100 uppercase">{row.paymentMethod || row.method || '—'}</span> },
        { header: 'Total', accessor: (row: any) => <span className="font-serif italic font-bold text-slate-800 text-sm">₹{Number(row.total || 0).toLocaleString()}</span> },
        { header: 'Status', accessor: (row: any) => <StatusBadge status={row.status} /> },
        {
            header: 'Update', accessor: (row: any) => (
                <div className="relative group">
                    <select
                        className="appearance-none border border-gray-100 text-[10px] font-black uppercase tracking-widest px-3 py-2 pr-8 rounded-xl bg-white focus:outline-none focus:border-luxury-gold cursor-pointer transition-all shadow-sm hover:border-gray-300"
                        value={row.status}
                        onChange={e => updateOrderStatus(row.id || (row as any)._id, { status: e.target.value })}
                    >
                        {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronDown size={12} />
                    </div>
                </div>
            )
        },
        {
            header: 'View', accessor: (row: any) => (
                <button
                    onClick={() => {
                        setSelectedOrderDetails(row);
                        setOrderDetailOpen(true);
                    }}
                    className="p-2 bg-gray-50 text-gray-400 hover:text-luxury-gold hover:bg-luxury-gold/5 rounded-xl transition-all"
                    title="View Full Details"
                >
                    <Eye size={16} />
                </button>
            )
        },
    ];


    const taglineColumns: TableColumn<Tagline>[] = [
        { header: 'Text', accessor: 'text' },
        { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
        { header: 'Action', accessor: (row) => <ActionButtons onClickEdit={() => handleEdit('tagline', row)} onClickDelete={() => handleDelete('tagline', row.id || (row as any)._id)} /> },
    ];


    const sliderColumns: TableColumn<Slider>[] = [
        { header: 'Preview', accessor: (row) => <img src={row.image} alt="Slider" className="w-24 h-12 object-cover rounded border border-gray-200" /> },
        { header: 'Title', accessor: 'title' },
        { header: 'Link', accessor: 'link' },
        { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
        { header: 'Action', accessor: (row) => <ActionButtons onClickEdit={() => handleEdit(modalType || 'slider', row)} onClickDelete={() => handleDelete(modalType || 'slider', row.id || (row as any)._id)} /> },
    ];
    const pageColumns: TableColumn<StaticPage>[] = [
        { header: 'Title', accessor: 'title' },
        { header: 'Last Updated', accessor: 'lastUpdated' },
        { header: 'Action', accessor: (row) => <ActionButtons onClickEdit={() => handleEdit('page', row)} onClickDelete={() => handleDelete('page', row.id || (row as any)._id)} /> },
    ];

    // Others reuse the simplistic view for brevity, as user focused on 'Add Buttons' primarily for the above.
    // ... (Other columns can be similar) ...

    const renderModalContent = () => {
        switch (modalType) {
            case 'tagline':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Tagline Text</label>
                            <input
                                type="text"
                                className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                value={formData.text || ''}
                                onChange={e => setFormData({ ...formData, text: e.target.value })}
                                placeholder="e.g. Complimentary Shipping on all orders above ₹999"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Status</label>
                            <select
                                className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm bg-white"
                                value={formData.status || 'ACTIVE'}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>
                );
            case 'site-settings':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Logo Text</label>
                                <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.logoText || ''} onChange={e => setFormData({ ...formData, logoText: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Logo Subtext</label>
                                <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.logoSubtext || ''} onChange={e => setFormData({ ...formData, logoSubtext: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Global Branding Logo</label>
                            <ImageUploader
                                value={formData.logoImage || ''}
                                onChange={url => setFormData({ ...formData, logoImage: url })}
                                folder="v2-logo"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Email</label>
                            <input type="email" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Phone</label>
                            <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Address</label>
                            <textarea className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Brand Slogan</label>
                                <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.slogan || ''} onChange={e => setFormData({ ...formData, slogan: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Copyright Text</label>
                                <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.copyright || ''} onChange={e => setFormData({ ...formData, copyright: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Store Hours (use \n for line breaks)</label>
                            <textarea className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.storeHours || ''} onChange={e => setFormData({ ...formData, storeHours: e.target.value })} />
                        </div>
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold">Shop Grid Config</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Mobile</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="2"
                                        className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-luxury-gold outline-none"
                                        value={formData.gridSettings?.mobile || 1}
                                        onChange={e => setFormData({
                                            ...formData,
                                            gridSettings: { ...formData.gridSettings, mobile: parseInt(e.target.value) }
                                        })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Tablet</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="3"
                                        className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-luxury-gold outline-none"
                                        value={formData.gridSettings?.tablet || 2}
                                        onChange={e => setFormData({
                                            ...formData,
                                            gridSettings: { ...formData.gridSettings, tablet: parseInt(e.target.value) }
                                        })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Desktop</label>
                                    <input
                                        type="number"
                                        min="3"
                                        max="6"
                                        className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-luxury-gold outline-none"
                                        value={formData.gridSettings?.desktop || 4}
                                        onChange={e => setFormData({
                                            ...formData,
                                            gridSettings: { ...formData.gridSettings, desktop: parseInt(e.target.value) }
                                        })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'hero':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Hero Video / Background</label>
                            <ImageUploader
                                value={formData.videoUrl || ''}
                                onChange={url => setFormData({ ...formData, videoUrl: url })}
                                accept="video/*,image/*"
                                folder="v2-hero"
                                isVideo={true}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Tagline</label>
                            <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.tagline || ''} onChange={e => setFormData({ ...formData, tagline: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Main Title (use \n for line breaks)</label>
                            <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm font-serif" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Description</label>
                            <textarea className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm h-24" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Primary Button</label>
                                <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.primaryBtnText || ''} onChange={e => setFormData({ ...formData, primaryBtnText: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Secondary Button</label>
                                <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.secondaryBtnText || ''} onChange={e => setFormData({ ...formData, secondaryBtnText: e.target.value })} />
                            </div>
                        </div>
                    </div>
                );
            case 'feature':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Icon (Lucide name, e.g. Truck)</label>
                            <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.caption || formData.icon || ''} onChange={e => setFormData({ ...formData, caption: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Title</label>
                            <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Description</label>
                            <textarea className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm h-24" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Status</label>
                            <select
                                className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm bg-white"
                                value={formData.status || 'ACTIVE'}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>
                );
            case 'commitment':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Tagline</label>
                            <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.tagline || ''} onChange={e => setFormData({ ...formData, tagline: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Title</label>
                            <input type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Description</label>
                            <textarea className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm h-32" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                    </div>
                );
            case 'product':
                return (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Product Name</label>
                                <input
                                    type="text"
                                    className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Status</label>
                                <select
                                    className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm bg-white"
                                    value={formData.status || 'ACTIVE'}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Description</label>
                            <textarea
                                className="w-full border p-2.5 rounded focus:outline-none focus:border-black h-24 text-sm"
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Material & Care</label>
                            <textarea
                                className="w-full border p-2.5 rounded focus:outline-none focus:border-black h-24 text-sm"
                                value={formData.materialCare || ''}
                                onChange={e => setFormData({ ...formData, materialCare: e.target.value })}
                                placeholder="Cotton 100%, Machine wash cold, etc."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Style Code (Group ID)</label>
                                <div className="relative group/tooltip">
                                    <input
                                        type="text"
                                        className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                        value={formData.styleCode || ''}
                                        onChange={e => setFormData({ ...formData, styleCode: e.target.value })}
                                        placeholder="e.g. V2-TSHIRT-01"
                                    />
                                    <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-black text-white text-[10px] rounded shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 pointer-events-none">
                                        Products with the exact same Style Code are considered variants of each other and will cross-link on the product page.
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Primary Color</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        className="h-10 w-12 cursor-pointer border-0 p-0 rounded overflow-hidden"
                                        value={formData.colorHex || '#000000'}
                                        onChange={e => setFormData({ ...formData, colorHex: e.target.value })}
                                        title="Pick actual color shade"
                                    />
                                    <input
                                        type="text"
                                        className="flex-1 border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                        value={formData.color || ''}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        placeholder="Color Name (e.g. Midnight Black)"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Price (₹)</label>
                                <input
                                    type="number"
                                    className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                    value={formData.price || ''}
                                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Original Price (₹)</label>
                                <input
                                    type="number"
                                    className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                    value={formData.originalPrice || ''}
                                    onChange={e => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Discount Text</label>
                                <input
                                    type="text"
                                    className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                    value={formData.discount || ''}
                                    onChange={e => setFormData({ ...formData, discount: e.target.value })}
                                    placeholder="e.g. 20% OFF"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Main Category</label>
                                <select
                                    className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm bg-white"
                                    value={formData.mainCategory || 'MENSWEAR'}
                                    onChange={e => setFormData({ ...formData, mainCategory: e.target.value })}
                                >
                                    {mainCategories.map((c, idx) => <option key={c._id || c.id || idx} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Sub Category</label>
                                <select
                                    className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm bg-white"
                                    value={formData.subCategory || ''}
                                    onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                                >
                                    <option value="">Select Sub Category</option>
                                    {subCategories.filter(s => s.parentCategory === formData.mainCategory || !formData.mainCategory).map((c, idx) => <option key={c._id || c.id || idx} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Variants & Inventory */}
                        <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">Variants & Inventory</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Size</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. XL"
                                        className="w-full border p-2 rounded text-xs"
                                        value={tempVariant.size}
                                        onChange={e => setTempVariant({ ...tempVariant, size: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded text-xs"
                                        value={tempVariant.quantity}
                                        onChange={e => setTempVariant({ ...tempVariant, quantity: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!tempVariant.size) return;
                                            const variants = formData.variants || [];
                                            setFormData({ ...formData, variants: [...variants, { ...tempVariant }] });
                                            setTempVariant({ ...tempVariant, size: '', quantity: 0 });
                                        }}
                                        className="w-full bg-luxury-black text-white p-2 rounded text-xs font-bold hover:bg-luxury-gold transition-colors"
                                    >
                                        Add Variant
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 mt-4">
                                {(formData.variants || []).map((v: any, idx: number) => (
                                    <div key={v.size || idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                        <div className="flex gap-4 items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Size</span>
                                                <span className="text-xs font-bold">{v.size}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Stock</span>
                                                <span className="text-xs font-bold text-luxury-gold">{v.quantity}</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const variants = [...formData.variants];
                                                variants.splice(idx, 1);
                                                setFormData({ ...formData, variants });
                                            }}
                                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Primary Product Image */}
                        <div>
                            <ImageUploader
                                label="Primary Product Image"
                                value={formData.photo || ''}
                                onChange={url => setFormData({ ...formData, photo: url })}
                                folder="v2-products"
                            />
                        </div>

                        {/* Secondary Hover Photo */}
                        <div>
                            <ImageUploader
                                label="Secondary Hover Photo (on card hover)"
                                value={formData.hoverImage || ''}
                                onChange={url => setFormData({ ...formData, hoverImage: url })}
                                folder="v2-products"
                            />
                        </div>

                        {/* Additional Photos Gallery & Video */}
                        <div className="space-y-3">
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">Product Gallery (Additional Photos)</label>
                            <ImageUploader
                                value=""
                                onChange={url => {
                                    if (!url) return;
                                    const photos = formData.photos || [];
                                    setFormData({ ...formData, photos: [...photos, url] });
                                }}
                                folder="v2-products"
                                compact={true}
                            />

                            <div className="mt-4">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Embedded Video URL (e.g. YouTube)</label>
                                <input
                                    type="text"
                                    className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm"
                                    value={formData.videoUrl || ''}
                                    onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                                    placeholder="https://www.youtube.com/embed/..."
                                />
                            </div>

                            <div className="flex flex-wrap gap-3 mt-4">
                                {(formData.photos || []).map((url: string, idx: number) => (
                                    <div key={idx} className="relative w-24 h-24 group">
                                        <img src={url} className="w-full h-full object-cover rounded-xl border border-gray-100 shadow-sm" />

                                        {/* Shift Left */}
                                        {idx > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const photos = [...formData.photos];
                                                    const temp = photos[idx - 1];
                                                    photos[idx - 1] = photos[idx];
                                                    photos[idx] = temp;
                                                    setFormData({ ...formData, photos });
                                                }}
                                                className="absolute top-1/2 -left-3 -translate-y-1/2 bg-white text-black rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-gray-100"
                                                title="Move Left"
                                            >
                                                <ChevronLeft size={14} />
                                            </button>
                                        )}

                                        {/* Shift Right */}
                                        {idx < (formData.photos.length - 1) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const photos = [...formData.photos];
                                                    const temp = photos[idx + 1];
                                                    photos[idx + 1] = photos[idx];
                                                    photos[idx] = temp;
                                                    setFormData({ ...formData, photos });
                                                }}
                                                className="absolute top-1/2 -right-3 -translate-y-1/2 bg-white text-black rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-gray-100"
                                                title="Move Right"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                        )}

                                        {/* Delete */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const photos = [...formData.photos];
                                                photos.splice(idx, 1);
                                                setFormData({ ...formData, photos });
                                            }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] text-center py-0.5 rounded-b-xl">
                                            {idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Advanced Attributes */}
                        <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">Advanced Attributes (Optional)</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Fabric</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.fabric || ''} onChange={e => setFormData({ ...formData, fabric: e.target.value })} placeholder="e.g. Cotton" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Pattern Type</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.patternType || ''} onChange={e => setFormData({ ...formData, patternType: e.target.value })} placeholder="e.g. Printed" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Collar</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.collar || ''} onChange={e => setFormData({ ...formData, collar: e.target.value })} placeholder="e.g. Round Neck" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Sleeve</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.sleeve || ''} onChange={e => setFormData({ ...formData, sleeve: e.target.value })} placeholder="e.g. Full Sleeve" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Neck</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.neck || ''} onChange={e => setFormData({ ...formData, neck: e.target.value })} placeholder="e.g. V-Neck" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Pocket</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.pocket || ''} onChange={e => setFormData({ ...formData, pocket: e.target.value })} placeholder="e.g. Single Pocket" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Length</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.length || ''} onChange={e => setFormData({ ...formData, length: e.target.value })} placeholder="e.g. 28" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Chest</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.chest || ''} onChange={e => setFormData({ ...formData, chest: e.target.value })} placeholder="e.g. 40" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Waist</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.waist || ''} onChange={e => setFormData({ ...formData, waist: e.target.value })} placeholder="e.g. 32" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Shoulder</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.shoulder || ''} onChange={e => setFormData({ ...formData, shoulder: e.target.value })} placeholder="e.g. 18" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Sleeve Length</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.sleeveLength || ''} onChange={e => setFormData({ ...formData, sleeveLength: e.target.value })} placeholder="e.g. 25" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 py-2">
                            <input
                                type="checkbox"
                                id="isNew"
                                className="w-4 h-4 rounded text-slate-800 focus:ring-slate-800"
                                checked={formData.isNewArrival || false}
                                onChange={e => setFormData({ ...formData, isNewArrival: e.target.checked })}
                            />
                            <label htmlFor="isNewArrival" className="text-sm font-bold text-slate-700 select-none">Mark as New Arrival</label>
                        </div>
                    </div >
                );
            case 'slider':
            case 'category-slider':
            case 'best-category-slider':
            case 'new-arrival-slider':
                return (
                    <div className="space-y-4">
                        <ImageUploader
                            label="Slider Image"
                            value={formData.image || ''}
                            onChange={url => setFormData({ ...formData, image: url })}
                            folder="v2-sliders"
                        />
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Title</label>
                            <input
                                type="text"
                                className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Slider Title"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Subtitle (Slogan)</label>
                            <input
                                type="text"
                                className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                value={formData.subtitle || ''}
                                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                                placeholder="Slider Slogan"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Link</label>
                            <input
                                type="text"
                                className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                value={formData.link || ''}
                                onChange={e => setFormData({ ...formData, link: e.target.value })}
                                placeholder="/example"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Status</label>
                            <select
                                className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm bg-white"
                                value={formData.status || 'ACTIVE'}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>
                );

            case 'main-category':
            case 'sub-category':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Name</label>
                            <input
                                type="text"
                                className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Slug</label>
                            <input
                                type="text"
                                className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                value={formData.slug || ''}
                                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Description</label>
                            <textarea
                                className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm h-24"
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Enter category description..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Image</label>
                            <ImageUploader
                                value={formData.image || ''}
                                onChange={url => setFormData({ ...formData, image: url })}
                                folder="v2-categories"
                            />
                        </div>
                        {modalType === 'sub-category' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Parent Category</label>
                                <select
                                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm bg-white"
                                    value={formData.parentCategory || ''}
                                    onChange={e => setFormData({ ...formData, parentCategory: e.target.value })}
                                >
                                    {mainCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Status</label>
                            <select
                                className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm bg-white"
                                value={formData.status || 'ACTIVE'}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>
                );
            case 'logo':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Logo Image</label>
                            <ImageUploader
                                value={formData.image || ''}
                                onChange={url => setFormData({ ...formData, image: url })}
                                folder="v2-logos"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Location</label>
                            <select
                                className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm bg-white"
                                value={formData.location || 'Header'}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                            >
                                <option value="Header">Header</option>
                                <option value="Footer">Footer</option>
                                <option value="Invoice">Invoice</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Status</label>
                            <select
                                className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm bg-white"
                                value={formData.status || 'ACTIVE'}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>
                );
            case 'page':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Page Title</label>
                            <input
                                type="text"
                                className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Terms of Service, Privacy Policy"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Content (HTML allowed)</label>
                            <textarea
                                className="w-full border p-3 rounded focus:outline-none focus:border-black min-h-[300px] text-sm font-mono"
                                value={formData.content || ''}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                placeholder="<h1>Title</h1><p>Content goes here...</p>"
                            />
                        </div>
                    </div>
                );
            case 'bestseller':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Heading</label>
                            <input
                                type="text"
                                className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                value={formData.heading || ''}
                                onChange={e => setFormData({ ...formData, heading: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Status</label>
                            <select
                                className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm bg-white"
                                value={formData.status || 'ACTIVE'}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>
                );
            case 'review':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Customer Name</label>
                            <input
                                type="text"
                                className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                value={formData.customerName || ''}
                                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Review Text</label>
                            <textarea
                                className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm h-24"
                                value={formData.reviewText || ''}
                                onChange={e => setFormData({ ...formData, reviewText: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Rating (1-5)</label>
                            <input
                                type="number"
                                min="1"
                                max="5"
                                className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                value={formData.rating || 5}
                                onChange={e => setFormData({ ...formData, rating: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Status</label>
                            <select
                                className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:border-luxury-gold text-sm bg-white"
                                value={formData.status || 'ACTIVE'}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>
                );
            case 'hero-slide':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Slide Type</label>
                                <select
                                    className="w-full border p-2.5 rounded bg-white text-sm"
                                    value={formData.type || 'image'}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="image">Image</option>
                                    <option value="video">Video</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Status</label>
                                <select
                                    className="w-full border p-2.5 rounded bg-white text-sm"
                                    value={formData.status || 'ACTIVE'}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Media (Image or Video)</label>
                            <ImageUploader
                                value={formData.url || ''}
                                onChange={url => setFormData({ ...formData, url: url })}
                                accept="image/*,video/*"
                                folder="v2-hero-slides"
                                isVideo={formData.type === 'video'}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Tagline</label>
                                <input type="text" className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm" value={formData.tagline || ''} onChange={e => setFormData({ ...formData, tagline: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">CTA Text</label>
                                <input type="text" className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm" value={formData.ctaText || ''} onChange={e => setFormData({ ...formData, ctaText: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Hero Title (Use \n for line breaks)</label>
                            <textarea className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm h-20" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Description</label>
                            <textarea className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm h-24" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Target Link (URL or /category/name)</label>
                            <input type="text" className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm" value={formData.ctaLink || ''} onChange={e => setFormData({ ...formData, ctaLink: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Slide Duration (ms)</label>
                            <input type="number" step="500" className="w-full border p-2.5 rounded focus:outline-none focus:border-black text-sm" placeholder="5000" value={formData.duration || ''} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })} />
                        </div>
                    </div>
                );
            case 'home-sections':
                return (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold border-b pb-1">General Headings</h4>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Categories Section Title</label>
                                <input type="text" className="w-full border p-2.5 rounded text-sm" value={formData.categoriesTitle || ''} onChange={e => setFormData({ ...formData, categoriesTitle: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Featured Tagline</label>
                                    <input type="text" className="w-full border p-2.5 rounded text-sm" value={formData.featuredTagline || ''} onChange={e => setFormData({ ...formData, featuredTagline: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Featured Title</label>
                                    <input type="text" className="w-full border p-2.5 rounded text-sm" value={formData.featuredTitle || ''} onChange={e => setFormData({ ...formData, featuredTitle: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold border-b pb-1">The New Standard ("Elevate Your Everyday")</h4>
                            <div className="flex items-center gap-4 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.newStandard?.isVisible ?? true}
                                        onChange={e => setFormData({
                                            ...formData,
                                            newStandard: {
                                                ...(formData.newStandard || {}),
                                                isVisible: e.target.checked
                                            }
                                        })}
                                    />
                                    <span className="text-sm font-bold text-slate-700">Display Section</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Tagline</label>
                                    <input type="text" className="w-full border p-2.5 rounded text-sm" value={formData.newStandard?.tagline || ''} onChange={e => setFormData({ ...formData, newStandard: { ...(formData.newStandard || {}), tagline: e.target.value } })} placeholder="The New Standard" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Title (use \n for line break)</label>
                                    <input type="text" className="w-full border p-2.5 rounded text-sm" value={formData.newStandard?.title || ''} onChange={e => setFormData({ ...formData, newStandard: { ...(formData.newStandard || {}), title: e.target.value } })} placeholder="Elevate Your \n Everyday." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Description</label>
                                <textarea className="w-full border p-2.5 rounded text-sm h-24" value={formData.newStandard?.description || ''} onChange={e => setFormData({ ...formData, newStandard: { ...(formData.newStandard || {}), description: e.target.value } })} placeholder="Discover the latest additions..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Image Override (Leave blank to show auto-picked new arrival product)</label>
                                <ImageUploader
                                    value={formData.newStandard?.image || ''}
                                    onChange={url => setFormData({ ...formData, newStandard: { ...(formData.newStandard || {}), image: url } })}
                                    folder="v2-banners"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Button Text</label>
                                    <input type="text" className="w-full border p-2.5 rounded text-sm" value={formData.newStandard?.buttonText || ''} onChange={e => setFormData({ ...formData, newStandard: { ...(formData.newStandard || {}), buttonText: e.target.value } })} placeholder="The New Collection" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Target Link</label>
                                    <input type="text" className="w-full border p-2.5 rounded text-sm" value={formData.newStandard?.link || ''} onChange={e => setFormData({ ...formData, newStandard: { ...(formData.newStandard || {}), link: e.target.value } })} placeholder="/new-arrivals" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold border-b pb-1">Promotional Banner</h4>
                            <div className="flex items-center gap-4 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.promotionalBanner?.isVisible}
                                        onChange={e => setFormData({
                                            ...formData,
                                            promotionalBanner: {
                                                ...(formData.promotionalBanner || {}),
                                                isVisible: e.target.checked
                                            }
                                        })}
                                    />
                                    <span className="text-sm font-bold text-slate-700">Display Live Banner</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Banner Title</label>
                                    <input type="text" className="w-full border p-2.5 rounded text-sm" value={formData.promotionalBanner?.title || ''} onChange={e => setFormData({ ...formData, promotionalBanner: { ...(formData.promotionalBanner || {}), title: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Banner Subtitle</label>
                                    <input type="text" className="w-full border p-2.5 rounded text-sm" value={formData.promotionalBanner?.subtitle || ''} onChange={e => setFormData({ ...formData, promotionalBanner: { ...(formData.promotionalBanner || {}), subtitle: e.target.value } })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Banner Image</label>
                                <ImageUploader
                                    value={formData.promotionalBanner?.image || ''}
                                    onChange={url => setFormData({ ...formData, promotionalBanner: { ...(formData.promotionalBanner || {}), image: url } })}
                                    folder="v2-banners"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Button Text</label>
                                    <input type="text" className="w-full border p-2.5 rounded text-sm" value={formData.promotionalBanner?.buttonText || ''} onChange={e => setFormData({ ...formData, promotionalBanner: { ...(formData.promotionalBanner || {}), buttonText: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Target Link</label>
                                    <input type="text" className="w-full border p-2.5 rounded text-sm" value={formData.promotionalBanner?.link || ''} onChange={e => setFormData({ ...formData, promotionalBanner: { ...(formData.promotionalBanner || {}), link: e.target.value } })} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold border-b pb-1">Featured Categories</h4>
                            {formData.categories?.map((cat: any, idx: number) => (
                                <div key={idx} className="p-4 bg-gray-50 rounded-xl space-y-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Category {idx + 1}</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            placeholder="Title"
                                            className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                            value={cat.title}
                                            onChange={e => {
                                                const newCats = [...formData.categories];
                                                newCats[idx] = { ...newCats[idx], title: e.target.value };
                                                setFormData({ ...formData, categories: newCats });
                                            }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Link"
                                            className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                            value={cat.link}
                                            onChange={e => {
                                                const newCats = [...formData.categories];
                                                newCats[idx] = { ...newCats[idx], link: e.target.value };
                                                setFormData({ ...formData, categories: newCats });
                                            }}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Image URL"
                                        className="w-full bg-transparent border-b border-gray-100 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-luxury-black transition-colors"
                                        value={cat.image}
                                        onChange={e => {
                                            const newCats = [...formData.categories];
                                            newCats[idx] = { ...newCats[idx], image: e.target.value };
                                            setFormData({ ...formData, categories: newCats });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b pb-1">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold">Promotional Sliders</h4>
                                <button
                                    onClick={() => {
                                        const newSlides = [...(formData.promotionalSliders || []), {
                                            id: Date.now(),
                                            image: '',
                                            title: 'New Slider',
                                            subtitle: 'SUBTITLE',
                                            link: '/shop',
                                            buttonText: 'Discover'
                                        }];
                                        setFormData({ ...formData, promotionalSliders: newSlides });
                                    }}
                                    className="text-[9px] font-bold text-luxury-black hover:text-luxury-gold uppercase tracking-widest"
                                >
                                    + Add Slide
                                </button>
                            </div>
                            <div className="space-y-4">
                                {formData.promotionalSliders?.map((slide: any, idx: number) => (
                                    <div key={idx} className="p-4 bg-gray-50 rounded-xl space-y-3 relative group">
                                        <button
                                            onClick={() => {
                                                const newSlides = formData.promotionalSliders.filter((_: any, i: number) => i !== idx);
                                                setFormData({ ...formData, promotionalSliders: newSlides });
                                            }}
                                            className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" placeholder="Title" className="w-full border p-2 rounded text-[10px] font-bold" value={slide.title} onChange={e => {
                                                const newSlides = [...formData.promotionalSliders];
                                                newSlides[idx] = { ...newSlides[idx], title: e.target.value };
                                                setFormData({ ...formData, promotionalSliders: newSlides });
                                            }} />
                                            <input type="text" placeholder="Subtitle" className="w-full border p-2 rounded text-[10px] font-bold" value={slide.subtitle} onChange={e => {
                                                const newSlides = [...formData.promotionalSliders];
                                                newSlides[idx] = { ...newSlides[idx], subtitle: e.target.value };
                                                setFormData({ ...formData, promotionalSliders: newSlides });
                                            }} />
                                        </div>
                                        <input type="text" placeholder="Image URL" className="w-full border p-2 rounded text-[10px] font-bold" value={slide.image} onChange={e => {
                                            const newSlides = [...formData.promotionalSliders];
                                            newSlides[idx] = { ...newSlides[idx], image: e.target.value };
                                            setFormData({ ...formData, promotionalSliders: newSlides });
                                        }} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" placeholder="Btn Text" className="w-full border p-2 rounded text-[10px] font-bold" value={slide.buttonText} onChange={e => {
                                                const newSlides = [...formData.promotionalSliders];
                                                newSlides[idx] = { ...newSlides[idx], buttonText: e.target.value };
                                                setFormData({ ...formData, promotionalSliders: newSlides });
                                            }} />
                                            <input type="text" placeholder="Link" className="w-full border p-2 rounded text-[10px] font-bold" value={slide.link} onChange={e => {
                                                const newSlides = [...formData.promotionalSliders];
                                                newSlides[idx] = { ...newSlides[idx], link: e.target.value };
                                                setFormData({ ...formData, promotionalSliders: newSlides });
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'about-content':
                return (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold border-b pb-1">Hero Section</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Hero Tagline</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.heroTagline || ''} onChange={e => setFormData({ ...formData, heroTagline: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Hero Title</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.heroTitle || ''} onChange={e => setFormData({ ...formData, heroTitle: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Hero Image URL</label>
                                <input type="text" className="w-full border p-2 rounded text-sm" value={formData.heroImage || ''} onChange={e => setFormData({ ...formData, heroImage: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold border-b pb-1">Philosophy & Vision</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Vision Tagline</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.visionTagline || ''} onChange={e => setFormData({ ...formData, visionTagline: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Vision Title</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.visionTitle || ''} onChange={e => setFormData({ ...formData, visionTitle: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Description Paragraph 1</label>
                                <textarea className="w-full border p-2 rounded text-sm h-20" value={formData.visionDescription1 || ''} onChange={e => setFormData({ ...formData, visionDescription1: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Description Paragraph 2</label>
                                <textarea className="w-full border p-2 rounded text-sm h-20" value={formData.visionDescription2 || ''} onChange={e => setFormData({ ...formData, visionDescription2: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Vision Image URL</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.visionImage || ''} onChange={e => setFormData({ ...formData, visionImage: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Archive Text</label>
                                    <input type="text" className="w-full border p-2 rounded text-sm" value={formData.visionArchiveText || ''} onChange={e => setFormData({ ...formData, visionArchiveText: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold border-b pb-1">Footer Aesthetics</h4>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Footer Image URL</label>
                                <input type="text" className="w-full border p-2 rounded text-sm" value={formData.footerImage || ''} onChange={e => setFormData({ ...formData, footerImage: e.target.value })} />
                            </div>
                        </div>
                    </div>
                );
            case 'contact':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 tracking-tight">{formData.name}</h3>
                                <p className="text-sm text-gray-500 font-medium">{formData.email}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Date Received</p>
                                <p className="text-sm font-bold text-slate-800 tracking-tight">{formData.date}</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Message Content</p>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium italic">
                                "{formData.message}"
                            </p>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-8 py-2.5 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-black transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                );
        }
    };


    const renderContent = () => {
        switch (activePage) {
            case 'dashboard':
                return <DashboardPage apiStats={apiStats} apiContacts={contacts} />;

            case 'customer':
                return (
                    <DataTable
                        title="Customers"
                        data={customers}
                        columns={customerColumns}
                        breadcrumbsPath={['Customers']}
                        currentPage={customerPagination.page}
                        totalPages={customerPagination.totalPages}
                        totalEntries={customerPagination.total}
                        onPageChange={(page) => fetchCustomers(page, 15)}
                        limit={15}
                    />
                );

            case 'hero-slider':
                return <DataTable
                    title="Hero Slider Center"
                    data={heroSlides.sort((a, b) => a.order - b.order)}
                    columns={[
                        {
                            header: 'Sequence', accessor: (row: HeroSlide) => (
                                <div className="flex flex-col gap-1 items-center bg-gray-50 p-2 rounded-lg border border-gray-100 italic font-serif">
                                    <button
                                        onClick={() => handleMoveSlide(row.id as string | number, 'up')}
                                        disabled={heroSlides.indexOf(row) === 0}
                                        className="p-1 hover:text-luxury-gold disabled:text-gray-200 transition-colors"
                                    >
                                        <ChevronUp size={14} />
                                    </button>
                                    <span className="text-[10px] font-bold text-luxury-gold">{row.order}</span>
                                    <button
                                        onClick={() => handleMoveSlide(row.id as string | number, 'down')}
                                        disabled={heroSlides.indexOf(row) === heroSlides.length - 1}
                                        className="p-1 hover:text-luxury-gold disabled:text-gray-200 transition-colors"
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            )
                        },
                        {
                            header: 'Preview', accessor: (row: HeroSlide) => (
                                <div className="w-20 aspect-video rounded-lg overflow-hidden border border-gray-100 bg-gray-50 relative group">
                                    {row.type === 'video' ? (
                                        <video src={row.url} className="w-full h-full object-cover" muted />
                                    ) : (
                                        <img src={row.url} alt={row.title} className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )
                        },
                        {
                            header: 'Tagline & Title', accessor: (row: HeroSlide) => (
                                <div className="max-w-xs">
                                    <p className="text-[8px] font-bold uppercase tracking-widest text-luxury-gold mb-1">{row.tagline}</p>
                                    <p className="font-serif italic text-sm text-luxury-black line-clamp-1">{row.title.replace('\n', ' ')}</p>
                                </div>
                            )
                        },
                        {
                            header: 'CTA', accessor: (row: HeroSlide) => (
                                <div className="text-[9px] font-bold">
                                    <span className="text-gray-400 uppercase tracking-widest mr-2">{row.ctaText}</span>
                                    <p className="text-luxury-black truncate max-w-[100px]">{row.ctaLink}</p>
                                </div>
                            )
                        },
                        { header: 'Status', accessor: (row: HeroSlide) => <StatusBadge status={row.status} /> },
                        { header: 'Duration', accessor: (row: HeroSlide) => `${row.duration || 5000}ms` },
                        { header: 'Action', accessor: (row) => <ActionButtons onClickEdit={() => handleEdit('hero-slide', row)} onClickDelete={() => handleDelete('hero-slide', (row as any).id || (row as any)._id)} /> },
                    ]}
                    onAdd={() => handleAdd('hero-slide')}
                    addButtonLabel="Create Slide"
                    breadcrumbsPath={['Site Content', 'Hero Slider']}
                />;

            case 'hero-features':
                return (
                    <div className="space-y-8 animate-fade-in">
                        <DataTable
                            title="Site Features"
                            data={features}
                            columns={[
                                { header: 'Icon', accessor: (row: FeatureItem) => <div className="p-2 bg-gray-50 rounded-lg inline-block"><div className="text-luxury-gold">{row.icon}</div></div> },
                                { header: 'Title', accessor: 'title' },
                                { header: 'Description', accessor: 'description' },
                                { header: 'Action', accessor: (row) => <ActionButtons onClickEdit={() => handleEdit('feature', row)} onClickDelete={() => handleDelete('feature', (row as any).id || (row as any)._id)} /> },
                            ]}
                            onAdd={() => handleAdd('feature')}
                            addButtonLabel="Add Feature"
                            breadcrumbsPath={['Content', 'Features']}
                        />
                    </div>
                );




            case 'products':
                return (
                    <DataTable
                        title="Products"
                        data={products}
                        columns={productColumns}
                        onAdd={() => handleAdd('product')}
                        addButtonLabel="Add Product"
                        breadcrumbsPath={['Products']}
                        currentPage={productPagination.page}
                        totalPages={productPagination.totalPages}
                        totalEntries={productPagination.total}
                        onPageChange={(page) => fetchProducts(page, 15)}
                        limit={15}
                    />
                );

            case 'orders':
                return (
                    <DataTable
                        title="Orders"
                        data={orders}
                        columns={orderColumns}
                        breadcrumbsPath={['Orders']}
                        currentPage={orderPagination.page}
                        totalPages={orderPagination.totalPages}
                        totalEntries={orderPagination.total}
                        onPageChange={(page) => fetchOrders(page, 15)}
                        limit={15}
                    />
                );



            case 'sliders':
            case 'main-slider':
            case 'category-slider':
            case 'best-category-slider':
            case 'new-arrival-slider':
                const sliderGroups = [
                    { title: 'Main Hero Sliders', data: mainSliders, type: 'slider', path: ['Sliders', 'Main Slider'] },
                    { title: 'Category Promo Sliders', data: categorySliders, type: 'category-slider', path: ['Sliders', 'Category Slider'] },
                    { title: 'Best Category Sliders', data: bestCategorySliders, type: 'best-category-slider', path: ['Sliders', 'Best Category Slider'] },
                    { title: 'New Arrival Sliders', data: newArrivalSliders, type: 'new-arrival-slider', path: ['Sliders', 'New Arrival Slider'] }
                ];

                return (
                    <div className="space-y-12 animate-fade-in">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 font-serif italic mb-1 tracking-tight">Slider Management Center</h2>
                                <p className="text-sm text-gray-400 font-medium">Control the visual flow of your store homepage.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-12">
                            {sliderGroups.map((group, gIdx) => (
                                <div key={gIdx} className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-luxury-gold rounded-full" />
                                            <h3 className="text-lg font-bold text-slate-700 tracking-tight uppercase text-xs tracking-widest">{group.title}</h3>
                                        </div>
                                        <button
                                            onClick={() => handleAdd(group.type)}
                                            className="px-4 py-1.5 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-black transition-all flex items-center gap-2"
                                        >
                                            <Plus size={14} /> Add {group.type.replace('-', ' ')}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {group.data.length > 0 ? group.data.map((slider) => (
                                            <div key={slider.id} className="group bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                                                <div className="aspect-[21/9] relative overflow-hidden bg-gray-50">
                                                    <img src={slider.image} alt={slider.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    <div className="absolute top-2 right-2 flex gap-1 transform translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => handleEdit(group.type, slider)} className="p-2 bg-white/90 text-blue-600 rounded-lg hover:bg-white shadow-sm"><Edit size={14} /></button>
                                                        <button onClick={() => handleDelete(group.type, (slider as any).id || (slider as any)._id)} className="p-2 bg-white/90 text-red-600 rounded-lg hover:bg-white shadow-sm"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                                <div className="p-4 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-bold text-slate-800 truncate">{slider.title}</h4>
                                                        <StatusBadge status={slider.status} />
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold truncate tracking-widest uppercase">{slider.link}</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="col-span-full border-2 border-dashed border-gray-100 rounded-xl py-12 flex flex-col items-center justify-center text-gray-300">
                                                <LayoutGrid size={32} strokeWidth={1} className="mb-2" />
                                                <p className="text-xs font-bold uppercase tracking-widest">No sliders in this group</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'main-category':
                return <DataTable title="Main Categories" data={mainCategories} columns={[
                    { header: 'Image', accessor: (row: Category) => <img src={row.image || 'https://picsum.photos/40/40'} alt={row.name} className="w-10 h-10 object-cover rounded border border-gray-200" /> },
                    { header: 'Name', accessor: 'name' },
                    { header: 'Slug', accessor: 'slug' },
                    { header: 'Status', accessor: (row: Category) => <StatusBadge status={row.status} /> },
                    { header: 'Action', accessor: (row) => <ActionButtons onClickEdit={() => handleEdit('main-category', row)} onClickDelete={() => handleDelete('main-category', row.id || (row as any)._id)} /> },
                ]} onAdd={() => handleAdd('main-category')} addButtonLabel="Add Category" breadcrumbsPath={['Category', 'Main Category']} />;

            case 'sub-category':
                return <DataTable title="Sub Categories" data={subCategories} columns={[
                    { header: 'Name', accessor: 'name' },
                    { header: 'Slug', accessor: 'slug' },
                    { header: 'Parent Category', accessor: 'parentCategory' as any },
                    { header: 'Status', accessor: (row: Category) => <StatusBadge status={row.status} /> },
                    { header: 'Action', accessor: (row) => <ActionButtons onClickEdit={() => handleEdit('sub-category', row)} onClickDelete={() => handleDelete('sub-category', row.id || (row as any)._id)} /> },
                ]} onAdd={() => handleAdd('sub-category')} addButtonLabel="Add Sub Category" breadcrumbsPath={['Category', 'Sub Category']} />;

            case 'reviews':
                return <DataTable
                    title="Reviews & Testimonials"
                    data={reviews}
                    columns={[
                        { header: 'Product', accessor: (row: any) => <div className="flex items-center gap-3"><img src={row.product?.photo || row.productPhoto || 'https://picsum.photos/40/40'} alt="Product" className="w-10 h-10 object-cover rounded border border-gray-200" /><span className="text-xs font-bold text-slate-800">{row.product?.name || row.productName || '—'}</span></div> },
                        { header: 'Customer', accessor: (row: any) => <div><p className="font-bold text-sm text-slate-800">{row.user?.name || row.customerName || '—'}</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{row.customerEmail || row.user?.email || '—'}</p></div> },
                        { header: 'Rating', accessor: (row: any) => <div className="flex text-luxury-gold">{"★".repeat(row.rating)}{"☆".repeat(5 - row.rating)}</div> },
                        { header: 'Review', accessor: (row: any) => <div className="max-w-xs"><p className="text-sm text-gray-600 line-clamp-2 italic">"{row.reviewText}"</p></div> },
                        {
                            header: 'Home', accessor: (row: any) => (
                                <button
                                    onClick={() => updateReview(row.id as number, { homepageVisible: !row.homepageVisible })}
                                    className={`p-1.5 rounded-lg transition-all ${row.homepageVisible ? 'bg-luxury-gold text-white shadow-sm shadow-luxury-gold/20' : 'bg-gray-50 text-gray-400 hover:text-luxury-black'}`}
                                    title={row.homepageVisible ? 'Visible on Homepage' : 'Hidden from Homepage'}
                                >
                                    <Eye size={14} />
                                </button>
                            )
                        },
                        { header: 'Status', accessor: (row: any) => <StatusBadge status={row.status} /> },
                        { header: 'Action', accessor: (row: any) => <ActionButtons onClickEdit={() => handleEdit('review', row)} onClickDelete={() => handleDelete('review', row.id || row._id)} /> },
                    ]}
                    onAdd={() => handleAdd('review')}
                    addButtonLabel="Create Review"
                    breadcrumbsPath={['Site Content', 'Reviews']}
                    bulkActions={[
                        {
                            label: 'Activate',
                            onClick: async (ids) => {
                                try {
                                    await Promise.all(ids.map(id => updateReview(id as number, { status: 'ACTIVE' })));
                                } catch (err) { console.error('Bulk activate failed:', err); }
                            }
                        },
                        {
                            label: 'Deactivate',
                            onClick: async (ids) => {
                                try {
                                    await Promise.all(ids.map(id => updateReview(id as number, { status: 'INACTIVE' })));
                                } catch (err) { console.error('Bulk deactivate failed:', err); }
                            }
                        },
                        {
                            label: 'Delete',
                            variant: 'danger',
                            onClick: async (ids) => {
                                if (!window.confirm(`Delete ${ids.length} review(s)?`)) return;
                                try {
                                    await Promise.all(ids.map(id => apiDeleteReview(id as number)));
                                } catch (err) { console.error('Bulk delete failed:', err); }
                            }
                        },
                    ]}
                />;

            case 'orders-all':
                return <DataTable title="All Orders" data={orders} columns={orderColumns} breadcrumbsPath={['Orders', 'All Orders']} />;

            case 'orders-sales':
                return <DataTable title="Sales Orders" data={orders.filter((o: any) => ['DELIVERED', 'Delivered'].includes(o.status))} columns={orderColumns} breadcrumbsPath={['Orders', 'Sales']} />;

            case 'orders-pending':
                return <DataTable title="Pending Orders" data={orders.filter((o: any) => ['PENDING', 'Pending', 'CONFIRMED', 'PROCESSING'].includes(o.status))} columns={orderColumns} breadcrumbsPath={['Orders', 'Pending']} />;

            case 'orders-refund':
                return <DataTable title="Refund Orders" data={orders.filter((o: any) => ['REFUNDED', 'Refunded', 'CANCELLED'].includes(o.status))} columns={orderColumns} breadcrumbsPath={['Orders', 'Refund']} />;

            case 'contact':
                return <DataTable title="Inquiry Inbox" data={contacts} columns={[
                    { header: 'Sender', accessor: (row: any) => <div><p className="font-bold text-slate-800">{row.name}</p><p className="text-xs text-gray-500">{row.email}</p></div> },
                    { header: 'Message', accessor: (row: any) => <p className="text-sm text-gray-600 line-clamp-2 italic max-w-xs">"{row.message}"</p> },
                    { header: 'Date', accessor: (row: any) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : row.date || '—' },
                    { header: 'Status', accessor: (row: any) => <StatusBadge status={row.status} /> },
                    {
                        header: 'Action', accessor: (row: any) => (
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => {
                                    setFormData(row);
                                    setModalType('contact');
                                    setModalOpen(true);
                                    markContactRead(row.id as number);
                                }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Eye size={16} /></button>
                                <button onClick={() => handleDelete('contact', row.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                            </div>
                        )
                    },
                ]} breadcrumbsPath={['Messages', 'Inquiry Inbox']} />;

            case 'logos':
                return <DataTable title="Logos" data={logos} columns={[
                    { header: 'Preview', accessor: (row: Logo) => <img src={row.image} alt="Logo" className="h-8 object-contain" /> },
                    { header: 'Location', accessor: 'location' },
                    { header: 'Status', accessor: (row: Logo) => <StatusBadge status={row.status} /> },
                    { header: 'Action', accessor: (row) => <ActionButtons onClickEdit={() => handleEdit('logo', row)} onClickDelete={() => handleDelete('logo', (row as any).id || (row as any)._id)} /> },
                ]} onAdd={() => handleAdd('logo')} addButtonLabel="Add Logo" breadcrumbsPath={['Logos']} />;

            case 'bestseller':
                return <DataTable title="Bestseller Headings" data={bestsellers} columns={[
                    { header: 'Heading', accessor: 'heading' },
                    { header: 'Status', accessor: (row: BestsellerHeading) => <StatusBadge status={row.status} /> },
                    { header: 'Action', accessor: (row) => <ActionButtons onClickEdit={() => handleEdit('bestseller', row)} onClickDelete={() => handleDelete('bestseller', (row as any).id || (row as any)._id)} /> },
                ]} onAdd={() => handleAdd('bestseller')} addButtonLabel="Add Heading" breadcrumbsPath={['Best seller heading']} />;

            case 'settings-branding':
                return (
                    <div className="space-y-8 animate-fade-in pb-12">
                        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-12">
                                    <div>
                                        <h2 className="text-3xl font-serif italic text-slate-800 mb-2">Logo & Visual Identity</h2>
                                        <p className="text-gray-500">Manage how your brand appears across the entire website.</p>
                                    </div>
                                    <button onClick={() => handleEdit('site-settings', siteSettings)} className="bg-luxury-black text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-luxury-gold transition-all shadow-xl shadow-black/10">
                                        <Edit size={18} /> Update Branding
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-luxury-gold">Brand Logo</h4>
                                        <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center min-h-[160px]">
                                            {siteSettings.logoImage ? (
                                                <img src={siteSettings.logoImage} alt="Brand Logo" className="h-16 object-contain" />
                                            ) : (
                                                <img src="/v2_logo.webp" alt="Default Logo" className="h-16 object-contain" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-6 md:col-span-2">
                                        <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-luxury-gold">Contact Hub</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Public Email</p>
                                                <p className="text-sm font-bold text-slate-800">{siteSettings.email}</p>
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Store Phone</p>
                                                <p className="text-sm font-bold text-slate-800">{siteSettings.phone}</p>
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 sm:col-span-2">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Global HQ Address</p>
                                                <p className="text-sm font-bold text-slate-800">{siteSettings.address}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6 md:col-span-3">
                                        <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-luxury-gold">Shop Grid Configuration</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <div className="p-6 bg-luxury-black text-white rounded-2xl shadow-xl">
                                                <p className="text-[9px] font-bold text-luxury-gold uppercase tracking-widest mb-1">Mobile View</p>
                                                <p className="text-2xl font-serif italic">{siteSettings.gridSettings?.mobile || 1} <span className="text-[10px] uppercase tracking-normal not-italic text-gray-400 ml-1">Cols</span></p>
                                            </div>
                                            <div className="p-6 bg-luxury-black text-white rounded-2xl shadow-xl">
                                                <p className="text-[9px] font-bold text-luxury-gold uppercase tracking-widest mb-1">Tablet View</p>
                                                <p className="text-2xl font-serif italic">{siteSettings.gridSettings?.tablet || 2} <span className="text-[10px] uppercase tracking-normal not-italic text-gray-400 ml-1">Cols</span></p>
                                            </div>
                                            <div className="p-6 bg-luxury-black text-white rounded-2xl shadow-xl">
                                                <p className="text-[9px] font-bold text-luxury-gold uppercase tracking-widest mb-1">Desktop View</p>
                                                <p className="text-2xl font-serif italic">{siteSettings.gridSettings?.desktop || 4} <span className="text-[10px] uppercase tracking-normal not-italic text-gray-400 ml-1">Cols</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DataTable title="Footer Features" data={features} columns={[
                            { header: 'Icon', accessor: 'icon' as any },
                            { header: 'Title', accessor: 'title' as any },
                            { header: 'Description', accessor: 'description' as any },
                            { header: 'Action', accessor: (row) => <ActionButtons onClickEdit={() => handleEdit('feature', row)} /> }
                        ]} showBreadcrumbs={false} />
                    </div>
                );

            case 'settings-social':
                return <SocialSettingsPage siteSettings={siteSettings} setSiteSettings={setSiteSettings} />;

            case 'settings-home':
                return (
                    <div className="space-y-12 animate-fade-in pb-12">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-4xl font-serif italic text-slate-800 mb-2">Homepage Control</h2>
                                <p className="text-gray-500">Configure sections and global homepage behavior.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Section Reordering */}
                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl lg:col-span-1">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl"><LayoutDashboard size={20} /></div>
                                    <h3 className="text-xl font-bold text-slate-800">Section Hierarchy</h3>
                                </div>
                                <div className="space-y-3">
                                    {homeSections.sectionOrder.map((sectionId, index) => (
                                        <div
                                            key={sectionId}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-luxury-gold transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-bold text-gray-300 w-4">0{index + 1}</span>
                                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-700">{sectionId.replace('-', ' ')}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleMoveHomeSection(index, 'up')}
                                                    disabled={index === 0}
                                                    className="p-2 text-gray-400 hover:text-luxury-black disabled:opacity-30 disabled:hover:text-gray-400"
                                                >
                                                    <ChevronUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleMoveHomeSection(index, 'down')}
                                                    disabled={index === homeSections.sectionOrder.length - 1}
                                                    className="p-2 text-gray-400 hover:text-luxury-black disabled:opacity-30 disabled:hover:text-gray-400"
                                                >
                                                    <ChevronDown size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest italic text-center">Drag and drop reordering coming soon</p>
                            </div>

                            <div className="lg:col-span-2 space-y-8">
                                {/* Promotional Hero Config */}
                                <div className="bg-luxury-black p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8 items-center">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-white/10 text-luxury-gold rounded-xl"><Sparkles size={20} /></div>
                                                <h3 className="text-2xl font-serif italic text-white">Promotional Hero</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                                    <p className="text-[9px] font-bold text-luxury-gold uppercase tracking-widest mb-1">Banner Title</p>
                                                    <p className="text-sm font-bold text-white line-clamp-1">{homeSections.promotionalBanner.title}</p>
                                                </div>
                                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                                    <p className="text-[9px] font-bold text-luxury-gold uppercase tracking-widest mb-1">Status</p>
                                                    <p className={`text-sm font-bold ${homeSections.promotionalBanner.isVisible ? 'text-green-400' : 'text-red-400'}`}>
                                                        {homeSections.promotionalBanner.isVisible ? 'Live' : 'Hidden'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleEdit('home-sections', homeSections)}
                                            className="px-8 py-4 bg-white text-luxury-black rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-luxury-gold hover:text-white transition-all"
                                        >
                                            Configure Banner
                                        </button>
                                    </div>
                                    {/* Glassy Background Image Preview */}
                                    <div className="absolute top-0 right-0 w-1/3 h-full opacity-20 transition-opacity">
                                        <img src={homeSections.promotionalBanner.image} className="w-full h-full object-cover blur-sm" />
                                    </div>
                                </div>

                                {/* Category & Featured Grid Config */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex flex-col justify-between">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-gold-50 text-luxury-gold rounded-xl"><LayoutGrid size={20} /></div>
                                                <h3 className="text-xl font-bold text-slate-800">Category Grid</h3>
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Desktop Columns: {homeSections.categoryColumns || 3}</label>
                                                <input
                                                    type="range"
                                                    min="2"
                                                    max="4"
                                                    step="1"
                                                    value={homeSections.categoryColumns || 3}
                                                    onChange={(e) => setHomeSections({ ...homeSections, categoryColumns: Number(e.target.value) })}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-luxury-black"
                                                />
                                                <div className="flex justify-between mt-2 text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                                                    <span>2 Columns</span>
                                                    <span>3 Columns</span>
                                                    <span>4 Columns</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleEdit('home-sections', homeSections)} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-800 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:border-luxury-gold hover:text-luxury-gold transition-all mt-6">
                                            Edit Headings
                                        </button>
                                    </div>

                                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex flex-col justify-between">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-rose-50 text-rose-500 rounded-xl"><Check size={20} /></div>
                                                <h3 className="text-xl font-bold text-slate-800">Trending Picker</h3>
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Hand-picked Items</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {(homeSections.trendingProductIds || []).map(id => {
                                                        const p = products.find(prod => prod.id === id);
                                                        return (
                                                            <div key={id} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-slate-600 flex items-center gap-2">
                                                                {p?.name.split(' ')[0]} <button onClick={() => setHomeSections({ ...homeSections, trendingProductIds: (homeSections.trendingProductIds || []).filter(tid => tid !== id) })} className="text-rose-500">×</button>
                                                            </div>
                                                        );
                                                    })}
                                                    <button onClick={() => setActivePage('products')} className="px-3 py-1 bg-luxury-black text-white rounded-full text-[10px] font-bold hover:bg-luxury-gold transition-colors flex items-center gap-1">
                                                        <Plus size={10} /> Add
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest italic text-center">
                                            {(homeSections.trendingProductIds || []).length} Products Highlighted
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'settings-about':
                return <AboutSettingsPage aboutContent={aboutContent} onEdit={() => handleEdit('about-content', aboutContent)} />;

            case 'settings-contact':
                return <ContactDetailsPage siteSettings={siteSettings} setSiteSettings={setSiteSettings} />;
            case 'taglines':
                return <DataTable
                    title="Dynamic Tagline Center"
                    data={taglines}
                    columns={taglineColumns}
                    onAdd={() => handleAdd('tagline')}
                    addButtonLabel="Add Tagline"
                    breadcrumbsPath={['Brand Hub', 'Taglines']}
                />;

            case 'pages':
                return <DataTable title="Page Management" data={pages} columns={pageColumns} onAdd={() => handleAdd('page')} addButtonLabel="Add Page" breadcrumbsPath={['Pages']} />;

            // Re-implement other cases as needed...

            default:
                return (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center h-[60vh] text-center space-y-8 bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5"
                    >
                        <div className="space-y-4">
                            <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.5em]">System Alert</span>
                            <h2 className="font-serif text-5xl italic text-slate-800 tracking-tighter">Module Not Found</h2>
                            <div className="luxury-divider mx-auto" />
                        </div>
                        <p className="max-w-md text-gray-400 text-sm leading-relaxed italic">
                            The administrative sector you are attempting to access is currently under development or has been relocated within the architecture.
                        </p>
                        <button
                            onClick={() => setActivePage('dashboard')}
                            className="px-10 py-4 bg-luxury-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-luxury-gold transition-colors shadow-2xl shadow-black/10"
                        >
                            Return to Command Center
                        </button>
                    </motion.div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <header className="fixed top-0 left-0 w-full h-16 bg-white shadow-sm z-30 flex items-center justify-between px-4 sm:px-6 border-b border-gray-100">
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-gray-50 rounded-xl text-luxury-black transition-all lg:hidden"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center gap-2 select-none">
                        <div className="flex items-center gap-3">
                            {siteSettings.logoImage ? (
                                <img src={siteSettings.logoImage} alt={siteSettings.logoText} className="h-6 w-auto object-contain" />
                            ) : (
                                <img src="/v2_logo.webp" alt="V2 Logo" className="h-6 w-auto object-contain" />
                            )}
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-luxury-black tracking-widest uppercase">{siteSettings.logoText}</span>
                                <span className="text-[7px] font-bold text-gray-400 tracking-widest uppercase leading-none">{siteSettings.logoSubtext}</span>
                            </div>
                        </div>
                        {/* Desktop Toggle */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-all hidden lg:block ml-4"
                        >
                            <Menu size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-luxury-black rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-gray-100"
                    >
                        <Store size={14} className="text-luxury-gold" />
                        <span>Live Site</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-red-100 shadow-sm shadow-red-200/20"
                    >
                        <LogOut size={14} />
                        <span className="hidden sm:inline">Terminate</span>
                    </button>
                </div>
            </header>

            <div className="pt-16 flex min-h-screen">
                <Sidebar activePage={activePage} onNavigate={(id) => { setActivePage(id); if (window.innerWidth < 1024) setSidebarOpen(false); }} isOpen={sidebarOpen} />

                <main className={`flex-1 p-4 sm:p-8 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
                    <div className="max-w-7xl mx-auto">
                        {renderContent()}
                    </div>
                </main>
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleSubmit}
                title={`Manage ${modalType?.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}`}
            >
                {renderModalContent()}
            </Modal>

            <OrderDetailsModal
                isOpen={orderDetailOpen}
                onClose={() => setOrderDetailOpen(false)}
                order={selectedOrderDetails}
                isAdmin={true}
            />
        </div>
    );
}

export default AdminDashboard;