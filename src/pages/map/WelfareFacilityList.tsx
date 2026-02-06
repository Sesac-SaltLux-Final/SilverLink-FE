
import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Clock, Navigation, List, Map } from "lucide-react";
import { mapApi } from "@/api/map";
import { WelfareFacilityResponse, ElderlySummaryResponse } from "@/types/api";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { adminNavItems } from "@/config/adminNavItems";
import { guardianNavItems } from "@/config/guardianNavItems";
import { counselorNavItems } from "@/config/counselorNavItems";
import { getMyElderly } from "@/api/guardians";
import elderlyApi from "@/api/elderly";

// Kakao Maps 타입 선언
declare global {
    interface Window {
        kakao: any;
    }
}

const FACILITY_TYPE_LABELS: Record<string, string> = {
    ELDERLY_WELFARE_CENTER: "노인복지관",
    DISABLED_WELFARE_CENTER: "장애인복지관",
    CHILD_WELFARE_CENTER: "아동복지관",
    COMMUNITY_WELFARE_CENTER: "종합사회복지관",
    SENIOR_CENTER: "경로당",
    DAYCARE_CENTER: "주간보호센터",
    HOME_CARE_SERVICE: "재가복지서비스"
};

export default function WelfareFacilityList() {
    const { user } = useAuth();
    const [facilities, setFacilities] = useState<WelfareFacilityResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [selectedFacility, setSelectedFacility] = useState<WelfareFacilityResponse | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [elderlyInfo, setElderlyInfo] = useState<ElderlySummaryResponse | null>(null);
    const [addressInfo, setAddressInfo] = useState<string>('');

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    // Determine Nav Items based on Role
    const getNavItems = () => {
        switch (user?.role) {
            case 'ADMIN': return adminNavItems;
            case 'GUARDIAN': return guardianNavItems;
            case 'COUNSELOR': return counselorNavItems;
            case 'ELDERLY': return []; // 어르신은 네비게이션 없음 (대시보드에서 직접 접근)
            default: return [];
        }
    };

    // Kakao Maps SDK 로딩 (services 라이브러리 포함)
    useEffect(() => {
        const kakaoApiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
        if (!kakaoApiKey) {
            console.warn("Kakao Map API Key is not set");
            return;
        }

        // 이미 로드된 경우 스킵
        if (window.kakao && window.kakao.maps) {
            setMapLoaded(true);
            return;
        }

        const script = document.createElement("script");
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services&autoload=false`;
        script.async = true;
        script.onload = () => {
            window.kakao.maps.load(() => {
                setMapLoaded(true);
                console.log("Kakao Maps SDK loaded with services");
            });
        };
        document.head.appendChild(script);
    }, []);

    // 보호자인 경우 연결된 어르신 정보 가져오기
    useEffect(() => {
        const fetchElderlyAddress = async () => {
            if (user?.role !== 'GUARDIAN') {
                // 보호자가 아닌 경우 현재 위치 사용
                getCurrentLocation();
                return;
            }

            setLoading(true);
            try {
                // 연결된 어르신 정보 가져오기
                const elderlyConnection = await getMyElderly();

                if (!elderlyConnection || !elderlyConnection.elderlyId) {
                    setError("연결된 어르신 정보가 없습니다.");
                    setLoading(false);
                    return;
                }

                // 어르신 상세 정보 가져오기
                const elderlyData = await elderlyApi.getSummary(elderlyConnection.elderlyId);
                setElderlyInfo(elderlyData);

                // 주소 정보 확인
                const address = elderlyData.fullAddress || elderlyData.addressLine1;
                if (!address) {
                    setError("어르신의 주소 정보가 등록되어 있지 않습니다.");
                    setLoading(false);
                    return;
                }

                setAddressInfo(address);

                // 주소를 좌표로 변환
                if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
                    const geocoder = new window.kakao.maps.services.Geocoder();

                    geocoder.addressSearch(address, (result: any, status: any) => {
                        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                            const lat = parseFloat(result[0].y);
                            const lon = parseFloat(result[0].x);
                            setLocation({ lat, lon });
                            fetchFacilities(lat, lon);
                        } else {
                            setError("주소에서 좌표를 찾을 수 없습니다. 관리자에게 문의해주세요.");
                            setLoading(false);
                        }
                    });
                } else {
                    setError("지도 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                setError("어르신 정보를 불러오는 중 오류가 발생했습니다.");
                setLoading(false);
            }
        };

        const getCurrentLocation = () => {
            if (!navigator.geolocation) {
                setError("이 브라우저에서는 위치 서비스를 지원하지 않습니다.");
                return;
            }

            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ lat: latitude, lon: longitude });
                    fetchFacilities(latitude, longitude);
                },
                (err) => {
                    console.error(err);
                    setError("위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.");
                    setLoading(false);
                }
            );
        };

        if (mapLoaded) {
            fetchElderlyAddress();
        }
    }, [user, mapLoaded]);

    // 지도 초기화 및 마커 표시
    useEffect(() => {
        if (!mapLoaded || !location || !mapContainerRef.current || viewMode !== 'map') return;

        // 지도 생성
        const options = {
            center: new window.kakao.maps.LatLng(location.lat, location.lon),
            level: 5 // 줌 레벨
        };

        const map = new window.kakao.maps.Map(mapContainerRef.current, options);
        mapRef.current = map;

        // 현재 위치 마커 (파란색)
        const currentPositionMarker = new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(location.lat, location.lon),
            map: map
        });

        // 현재 위치 인포윈도우
        const locationLabel = user?.role === 'GUARDIAN' && elderlyInfo
            ? `📍 ${elderlyInfo.name}님 댁`
            : '📍 현재 위치';
        const currentInfoWindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:5px;font-size:12px;font-weight:bold;">${locationLabel}</div>`
        });
        currentInfoWindow.open(map, currentPositionMarker);

        // 기존 마커 제거
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // 시설 마커 추가
        facilities.forEach((facility) => {
            const markerPosition = new window.kakao.maps.LatLng(facility.latitude, facility.longitude);

            // 커스텀 마커 이미지 (빨간색 핀)
            const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png';
            const imageSize = new window.kakao.maps.Size(24, 35);
            const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize);

            const marker = new window.kakao.maps.Marker({
                position: markerPosition,
                map: map,
                image: markerImage,
                title: facility.name
            });

            // 인포윈도우 생성
            const infoWindow = new window.kakao.maps.InfoWindow({
                content: `<div style="padding:8px;font-size:12px;max-width:200px;">
                    <strong>${facility.name}</strong><br/>
                    <span style="color:#666;">${FACILITY_TYPE_LABELS[facility.type] || facility.type}</span>
                </div>`
            });

            // 마커 클릭 이벤트
            window.kakao.maps.event.addListener(marker, 'click', () => {
                setSelectedFacility(facility);
                infoWindow.open(map, marker);
            });

            // 마우스 오버 이벤트
            window.kakao.maps.event.addListener(marker, 'mouseover', () => {
                infoWindow.open(map, marker);
            });

            window.kakao.maps.event.addListener(marker, 'mouseout', () => {
                if (selectedFacility?.id !== facility.id) {
                    infoWindow.close();
                }
            });

            markersRef.current.push(marker);
        });

    }, [mapLoaded, location, facilities, viewMode]);

    const fetchFacilities = async (lat: number, lon: number) => {
        try {
            // 반경 3km 내 검색 (지도 표시를 위해 범위 확대)
            const data = await mapApi.getNearbyFacilities(lat, lon, 3);
            setFacilities(data);
        } catch (err) {
            console.error(err);
            setError("시설 정보를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const openExternalMap = (facility: WelfareFacilityResponse) => {
        const url = `https://map.kakao.com/link/to/${facility.name},${facility.latitude},${facility.longitude}`;
        window.open(url, '_blank');
    };

    const handleFacilityClick = (facility: WelfareFacilityResponse) => {
        setSelectedFacility(facility);
        if (mapRef.current && viewMode === 'map') {
            const moveLatLon = new window.kakao.maps.LatLng(facility.latitude, facility.longitude);
            mapRef.current.panTo(moveLatLon);
        }
    };

    const content = (
        <div className="container mx-auto p-4 max-w-2xl">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-primary" />
                    내 주변 복지 시설
                </h1>
                <div className="flex gap-1">
                    <Button
                        variant={viewMode === 'map' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('map')}
                    >
                        <Map className="w-4 h-4 mr-1" />
                        지도
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="w-4 h-4 mr-1" />
                        목록
                    </Button>
                </div>
            </div>

            {loading && <div className="text-center py-8">위치 확인 및 데이터 조회 중...</div>}

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-sm">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* 지도 뷰 */}
                    {viewMode === 'map' && (
                        <div className="space-y-4">
                            <div
                                ref={mapContainerRef}
                                className="w-full h-80 rounded-lg border shadow-sm"
                                style={{ minHeight: '320px' }}
                            />
                            <div className="text-sm text-gray-500 text-center">
                                {user?.role === 'GUARDIAN' && elderlyInfo ? (
                                    <>
                                        📍 {elderlyInfo.name}님 댁 기준 반경 3km 내 시설 {facilities.length}개
                                        <div className="text-xs mt-1">({addressInfo})</div>
                                    </>
                                ) : (
                                    <>📍 현재 위치 기준 반경 3km 내 시설 {facilities.length}개</>
                                )}
                            </div>

                            {/* 선택된 시설 상세 정보 */}
                            {selectedFacility && (
                                <Card className="border-2 border-primary shadow-md">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="secondary">
                                                {selectedFacility.typeDescription || FACILITY_TYPE_LABELS[selectedFacility.type] || selectedFacility.type}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg">{selectedFacility.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <div className="flex items-start gap-2 text-gray-600">
                                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                            <span>{selectedFacility.address}</span>
                                        </div>
                                        {selectedFacility.phone && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Phone className="w-4 h-4 shrink-0" />
                                                <a href={`tel:${selectedFacility.phone}`} className="hover:underline">
                                                    {selectedFacility.phone}
                                                </a>
                                            </div>
                                        )}
                                        {selectedFacility.operatingHours && (
                                            <div className="flex items-start gap-2 text-gray-600">
                                                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                                                <span>{selectedFacility.operatingHours}</span>
                                            </div>
                                        )}
                                        {selectedFacility.description && (
                                            <div className="p-3 rounded-lg bg-muted/50 text-gray-600">
                                                <p className="text-sm">{selectedFacility.description}</p>
                                            </div>
                                        )}
                                        <Button
                                            className="w-full mt-4 bg-[#FEE500] text-black hover:bg-[#FEE500]/90"
                                            onClick={() => openExternalMap(selectedFacility)}
                                        >
                                            <Navigation className="w-4 h-4 mr-2" />
                                            길찾기
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* 시설 리스트 (간략) */}
                            <div className="grid grid-cols-2 gap-2">
                                {facilities.map((facility) => (
                                    <button
                                        key={facility.id}
                                        className={`p-3 text-left rounded-lg border transition-all ${selectedFacility?.id === facility.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        onClick={() => handleFacilityClick(facility)}
                                    >
                                        <div className="font-medium text-sm truncate">{facility.name}</div>
                                        <div className="text-xs text-gray-500 truncate">
                                            {FACILITY_TYPE_LABELS[facility.type] || facility.type}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 리스트 뷰 */}
                    {viewMode === 'list' && (
                        <>
                            {facilities.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    반경 3km 이내에 조회된 시설이 없습니다.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {facilities.map((facility) => (
                                        <Card key={facility.id} className="shadow-sm">
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start">
                                                    <Badge variant="secondary" className="mb-2">
                                                        {facility.typeDescription || FACILITY_TYPE_LABELS[facility.type] || facility.type}
                                                    </Badge>
                                                </div>
                                                <CardTitle className="text-lg">{facility.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2 text-sm">
                                                <div className="flex items-start gap-2 text-gray-600">
                                                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                                    <span>{facility.address}</span>
                                                </div>
                                                {facility.phone && (
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Phone className="w-4 h-4 shrink-0" />
                                                        <a href={`tel:${facility.phone}`} className="hover:underline">
                                                            {facility.phone}
                                                        </a>
                                                    </div>
                                                )}
                                                {facility.operatingHours && (
                                                    <div className="flex items-start gap-2 text-gray-600">
                                                        <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                                                        <span>{facility.operatingHours}</span>
                                                    </div>
                                                )}

                                                <Button
                                                    className="w-full mt-4 bg-[#FEE500] text-black hover:bg-[#FEE500]/90"
                                                    onClick={() => openExternalMap(facility)}
                                                >
                                                    <Navigation className="w-4 h-4 mr-2" />
                                                    카카오맵으로 보기
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );

    // 어르신은 DashboardLayout 없이 전체 화면으로 표시
    if (user?.role === 'ELDERLY') {
        return (
            <div className="min-h-screen bg-background">
                {content}
            </div>
        );
    }

    // 다른 역할은 DashboardLayout 사용
    if (user) {
        return (
            <DashboardLayout
                role={user.role.toLowerCase() as "admin" | "guardian" | "counselor"}
                userName={user.name}
                navItems={getNavItems()}
            >
                {content}
            </DashboardLayout>
        );
    }

    // 로그인하지 않은 경우
    return (
        <div className="min-h-screen bg-background">
            {content}
        </div>
    );
}
