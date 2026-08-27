import React from 'react';
import {
  Plane,
  Home,
  MapPin,
  Map,
  Wallet,
  User,
  Search,
  Calendar,
  Clock,
  Star,
  Gem,
  Leaf,
  Bed,
  Utensils,
  Coffee,
  Sun,
  Camera,
  ShoppingCart,
  SlidersHorizontal,
  Navigation,
  Check,
  CheckCircle2,
  X,
  Trash2,
  Edit,
  Share2,
  Copy,
  RefreshCw,
  Moon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Users,
  CreditCard,
  Shield,
  Globe,
  Bell,
  Plus,
  Send,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Info,
  AlertTriangle,
  LogOut,
  Settings,
  Eye,
  EyeOff,
  Phone,
  Lock,
  Compass,
  Footprints,
  Beer,
  Wine,
  Activity as ActivityIcon,
  Tag,
  Receipt,
  PieChart,
  DollarSign,
  TrendingUp,
  CheckCheck,
} from 'lucide-react';

interface WebIconProps {
  name: string;
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const WebIcon: React.FC<WebIconProps> = ({
  name,
  size = 20,
  color = 'currentColor',
  className = '',
  style,
}) => {
  const normName = (name || '').toLowerCase().replace(/-outline$/, '').replace(/^logo-/, '');

  const iconProps = {
    size: typeof size === 'number' ? size : parseInt(size as string, 10) || 20,
    color,
    className,
    style,
  };

  switch (normName) {
    case 'airplane':
    case 'plane':
    case 'flight':
      return <Plane {...iconProps} />;
    case 'home':
      return <Home {...iconProps} />;
    case 'map':
      return <Map {...iconProps} />;
    case 'location':
    case 'pin':
      return <MapPin {...iconProps} />;
    case 'wallet':
    case 'cash':
      return <Wallet {...iconProps} />;
    case 'person':
    case 'user':
      return <User {...iconProps} />;
    case 'search':
      return <Search {...iconProps} />;
    case 'calendar':
      return <Calendar {...iconProps} />;
    case 'time':
    case 'clock':
      return <Clock {...iconProps} />;
    case 'star':
      return <Star {...iconProps} />;
    case 'diamond':
      return <Gem {...iconProps} />;
    case 'leaf':
      return <Leaf {...iconProps} />;
    case 'bed':
    case 'hotel':
    case 'lodging':
    case 'stay':
      return <Bed {...iconProps} />;
    case 'restaurant':
    case 'food':
    case 'dining':
      return <Utensils {...iconProps} />;
    case 'cafe':
    case 'coffee':
    case 'tea':
      return <Coffee {...iconProps} />;
    case 'sunny':
    case 'beach':
    case 'sun':
      return <Sun {...iconProps} />;
    case 'camera':
    case 'museum':
    case 'art':
    case 'sightseeing':
      return <Camera {...iconProps} />;
    case 'cart':
    case 'bag-handle':
    case 'shopping':
      return <ShoppingCart {...iconProps} />;
    case 'options':
    case 'sliders':
      return <SlidersHorizontal {...iconProps} />;
    case 'navigate':
    case 'compass':
      return <Navigation {...iconProps} />;
    case 'checkmark':
    case 'check':
      return <Check {...iconProps} />;
    case 'checkmark-circle':
      return <CheckCircle2 {...iconProps} />;
    case 'close':
    case 'x':
      return <X {...iconProps} />;
    case 'trash':
      return <Trash2 {...iconProps} />;
    case 'create':
    case 'edit':
      return <Edit {...iconProps} />;
    case 'share':
    case 'share-social':
      return <Share2 {...iconProps} />;
    case 'copy':
      return <Copy {...iconProps} />;
    case 'refresh':
    case 'reload':
      return <RefreshCw {...iconProps} />;
    case 'moon':
      return <Moon {...iconProps} />;
    case 'chevron-back':
    case 'chevron-left':
      return <ChevronLeft {...iconProps} />;
    case 'chevron-forward':
    case 'chevron-right':
      return <ChevronRight {...iconProps} />;
    case 'chevron-down':
      return <ChevronDown {...iconProps} />;
    case 'chevron-up':
      return <ChevronUp {...iconProps} />;
    case 'chatbubbles':
    case 'chat':
    case 'message':
      return <MessageCircle {...iconProps} />;
    case 'people':
    case 'users':
    case 'group':
      return <Users {...iconProps} />;
    case 'card':
    case 'credit-card':
      return <CreditCard {...iconProps} />;
    case 'shield':
      return <Shield {...iconProps} />;
    case 'globe':
    case 'language':
      return <Globe {...iconProps} />;
    case 'notifications':
    case 'bell':
      return <Bell {...iconProps} />;
    case 'plus':
    case 'add':
      return <Plus {...iconProps} />;
    case 'send':
      return <Send {...iconProps} />;
    case 'sparkles':
    case 'ai':
      return <Sparkles {...iconProps} />;
    case 'arrow-forward':
    case 'arrow-right':
      return <ArrowRight {...iconProps} />;
    case 'arrow-back':
    case 'arrow-left':
      return <ArrowLeft {...iconProps} />;
    case 'walk':
      return <Footprints {...iconProps} />;
    case 'nightlife':
    case 'wine':
      return <Wine {...iconProps} />;
    case 'drinks':
    case 'beer':
      return <Beer {...iconProps} />;
    case 'phone':
    case 'call':
      return <Phone {...iconProps} />;
    case 'lock':
      return <Lock {...iconProps} />;
    case 'receipt':
      return <Receipt {...iconProps} />;
    case 'pricetag':
      return <Tag {...iconProps} />;
    case 'pie-chart':
    case 'analytics':
      return <PieChart {...iconProps} />;
    case 'trending-up':
      return <TrendingUp {...iconProps} />;
    case 'check-check':
      return <CheckCheck {...iconProps} />;
    case 'info':
      return <Info {...iconProps} />;
    case 'warning':
    case 'alert':
      return <AlertTriangle {...iconProps} />;
    case 'log-out':
    case 'exit':
      return <LogOut {...iconProps} />;
    case 'settings':
      return <Settings {...iconProps} />;
    default:
      return <MapPin {...iconProps} />;
  }
};

export const Ionicons = {
  glyphMap: {} as any,
};
