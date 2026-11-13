<script lang="ts">
	import {
		Home, KeyRound, Rotate3d, TrendingUp, ShieldCheck, Building2,
		MapPin, Phone, Mail, Clock, Star, BedDouble, Bath, Car, Ruler,
		CheckCircle2, ArrowRight, Menu, X, Bell, BellRing, Send, Users,
		FileText, Briefcase, LogOut, LayoutDashboard, Inbox, Settings,
		Megaphone, Newspaper, Image as ImageIcon, Plus, Pencil, Trash2,
		Eye, EyeOff, Search, ExternalLink, CircleAlert, LoaderCircle,
		Facebook, Instagram, Linkedin, Youtube, MessageCircle, ChevronDown,
		Sparkles, Award, Handshake, Globe, Upload, Save, Bot, Monitor,
		Smartphone, Download, Activity, XCircle, Mic, MicOff
	} from '@lucide/svelte';

	const iconos: Record<string, typeof Home> = {
		home: Home, 'key-round': KeyRound, 'rotate-3d': Rotate3d,
		'trending-up': TrendingUp, 'shield-check': ShieldCheck, 'building-2': Building2,
		'map-pin': MapPin, phone: Phone, mail: Mail, clock: Clock, star: Star,
		'bed-double': BedDouble, bath: Bath, car: Car, ruler: Ruler,
		'check-circle': CheckCircle2, 'arrow-right': ArrowRight, menu: Menu, x: X,
		bell: Bell, 'bell-ring': BellRing, send: Send, users: Users,
		'file-text': FileText, briefcase: Briefcase, 'log-out': LogOut,
		'layout-dashboard': LayoutDashboard, inbox: Inbox, settings: Settings,
		megaphone: Megaphone, newspaper: Newspaper, image: ImageIcon, plus: Plus,
		pencil: Pencil, trash: Trash2, eye: Eye, 'eye-off': EyeOff, search: Search,
		'external-link': ExternalLink, 'circle-alert': CircleAlert, loader: LoaderCircle,
		facebook: Facebook, instagram: Instagram, linkedin: Linkedin, youtube: Youtube,
		'message-circle': MessageCircle, 'chevron-down': ChevronDown, sparkles: Sparkles,
		award: Award, handshake: Handshake, globe: Globe, upload: Upload, save: Save,
		bot: Bot, monitor: Monitor, smartphone: Smartphone, download: Download,
		activity: Activity, 'x-circle': XCircle, mic: Mic, 'mic-off': MicOff
	};

	interface Props {
		nombre: string;
		size?: number;
		class?: string;
	}

	let { nombre, size = 20, class: clase = '' }: Props = $props();
	const Componente = $derived(iconos[nombre] ?? Sparkles);
</script>

<Componente {size} class={clase} />
