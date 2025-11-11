import { useState, useEffect, useCallback, useMemo } from "react";
import Head from "next/head";

interface ImageData {
  name: string;
  url: string;
  path: string;
  directory: string;
  size?: number;
}

export default function Home() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      // 移除强制无缓存，允许浏览器缓存
      const response = await fetch('/api/images');
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // 初始化深色模式状态
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode));
    } else {
      // 检查系统偏好
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setDarkMode(prefersDark);
    }
  }, []);

  // 切换深色模式
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", JSON.stringify(newDarkMode));
  };

  // 使用 useMemo 优化过滤计算
  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      // 按目录过滤
      const matchesDirectory = selectedDirectory
        ? img.directory === selectedDirectory
        : true;

      // 按搜索关键词过滤
      const matchesSearch = searchQuery
        ? img.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      return matchesDirectory && matchesSearch;
    });
  }, [images, selectedDirectory, searchQuery]);

  // 使用 useMemo 优化目录列表计算
  const directories = useMemo(() => {
    return Array.from(new Set(images.map((img) => img.directory))).sort();
  }, [images]);

  // 使用 useMemo 优化目录图片计数
  const directoryImageCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    images.forEach((img) => {
      counts[img.directory] = (counts[img.directory] || 0) + 1;
    });
    return counts;
  }, [images]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleDownload = async (image: ImageData) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = image.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  const openModal = (image: ImageData) => setSelectedImage(image);
  const closeModal = () => setSelectedImage(null);

  // 多选相关函数
  const toggleSelection = (imageUrl: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageUrl)) {
      newSelected.delete(imageUrl);
    } else {
      newSelected.add(imageUrl);
    }
    setSelectedImages(newSelected);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (!isSelectionMode) {
      setSelectedImages(new Set());
    }
  };

  const selectAll = () => {
    const allImageUrls = new Set(filteredImages.map(img => img.url));
    setSelectedImages(allImageUrls);
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
  };

  const handleBatchDownload = async () => {
    const selectedImageData = filteredImages.filter(img => selectedImages.has(img.url));
    
    if (selectedImageData.length === 0) return;

    // 如果只有一张图片，直接下载
    if (selectedImageData.length === 1) {
      await handleDownload(selectedImageData[0]);
      return;
    }

    // 批量下载多张图片
    const downloadPromises = selectedImageData.map(async (image, index) => {
      try {
        // 添加延迟避免同时下载太多文件
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * index));
        }
        await handleDownload(image);
      } catch (error) {
        console.error(`下载失败: ${image.name}`, error);
      }
    });

    await Promise.all(downloadPromises);
  };

  // 图片导航功能 - 使用 useMemo 优化索引计算
  const currentImageIndex = useMemo(() => {
    return selectedImage 
      ? filteredImages.findIndex(img => img.url === selectedImage.url)
      : -1;
  }, [selectedImage, filteredImages]);

  const goToPrevImage = useCallback(() => {
    if (currentImageIndex > 0) {
      setSelectedImage(filteredImages[currentImageIndex - 1]);
      setImageLoading(true);
    }
  }, [currentImageIndex, filteredImages]);

  const goToNextImage = useCallback(() => {
    if (currentImageIndex < filteredImages.length - 1) {
      setSelectedImage(filteredImages[currentImageIndex + 1]);
      setImageLoading(true);
    }
  }, [currentImageIndex, filteredImages]);

  // 键盘支持 - 优化依赖项
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedImage) return;
      
      switch (event.key) {
        case 'Escape':
          closeModal();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevImage();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNextImage();
          break;
      }
    };

    if (selectedImage) {
      document.addEventListener('keydown', handleKeyDown);
      // 禁止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selectedImage, goToPrevImage, goToNextImage]);

  return (
    <>
      <Head>
        <title>图库</title>
        <meta name="description" content="简单的图片预览和下载工具" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        className={`flex h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
      >
        {/* 左侧导航栏 */}
        <div
          className={`w-64 ${
            darkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          } border-r flex flex-col`}
        >
          {/* 标题 */}
          <div
            className={`p-6 border-b ${
              darkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h1
                className={`text-xl font-bold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                图库
              </h1>

              {/* 深色模式切换按钮 */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? "bg-gray-700 text-yellow-400 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={darkMode ? "切换到浅色模式" : "切换到深色模式"}
              >
                {darkMode ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>

            {/* 搜索框 */}
            <div className="mt-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索图片文件名..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  }`}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className={`h-5 w-5 ${
                      darkMode ? "text-gray-400" : "text-gray-400"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg
                      className={`h-5 w-5 ${
                        darkMode
                          ? "text-gray-400 hover:text-gray-300"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 目录列表 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedDirectory("")}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedDirectory === ""
                      ? darkMode
                        ? "bg-blue-900 text-blue-300 border border-blue-700"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                      : darkMode
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  📂 全部目录
                  <span
                    className={`float-right text-xs ${
                      darkMode ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {images.length}
                  </span>
                </button>

                {directories.map((dir) => (
                  <button
                    key={dir}
                    onClick={() => setSelectedDirectory(dir)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedDirectory === dir
                        ? darkMode
                          ? "bg-blue-900 text-blue-300 border border-blue-700"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                        : darkMode
                        ? "text-gray-300 hover:bg-gray-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    📁 {dir || "根目录"}
                    <span
                      className={`float-right text-xs ${
                        darkMode ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {directoryImageCounts[dir] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧主内容区 */}
        <div className="flex-1 flex flex-col">
          {/* 顶部工具栏 */}
          <div
            className={`${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            } border-b px-6 py-4`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`text-sm ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {searchQuery ? (
                  <>
                    搜索 "
                    <span className="font-medium text-blue-600">
                      {searchQuery}
                    </span>
                    "
                    {selectedDirectory && (
                      <>
                        {" "}
                        在目录{" "}
                        <span className="font-medium">{selectedDirectory}</span>
                      </>
                    )}{" "}
                    找到{" "}
                    <span className="font-medium text-blue-600">
                      {filteredImages.length}
                    </span>{" "}
                    张图片
                  </>
                ) : selectedDirectory ? (
                  <>
                    目录 <span className="font-medium">{selectedDirectory}</span>{" "}
                    中共找到{" "}
                    <span className="font-medium text-blue-600">
                      {filteredImages.length}
                    </span>{" "}
                    张图片
                  </>
                ) : (
                  <>
                    共找到{" "}
                    <span className="font-medium text-blue-600">
                      {filteredImages.length}
                    </span>{" "}
                    张图片
                  </>
                )}
              </div>

              {/* 多选控制按钮 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectionMode}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    isSelectionMode
                      ? darkMode
                        ? "bg-blue-900 text-blue-300 border border-blue-700"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                      : darkMode
                      ? "text-gray-300 hover:bg-gray-700 border border-gray-600"
                      : "text-gray-600 hover:bg-gray-50 border border-gray-300"
                  }`}
                >
                  {isSelectionMode ? "取消选择" : "批量选择"}
                </button>
              </div>
            </div>

            {/* 批量操作工具栏 */}
            {isSelectionMode && (
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                darkMode ? "bg-gray-700" : "bg-gray-50"
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}>
                    已选择 {selectedImages.size} 张图片
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAll}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        darkMode
                          ? "text-blue-400 hover:bg-gray-600"
                          : "text-blue-600 hover:bg-blue-50"
                      }`}
                    >
                      全选
                    </button>
                    
                    <button
                      onClick={clearSelection}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        darkMode
                          ? "text-gray-400 hover:bg-gray-600"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      清空
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchDownload}
                    disabled={selectedImages.size === 0}
                    className={`px-4 py-2 text-sm rounded-md transition-colors ${
                      selectedImages.size === 0
                        ? darkMode
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      下载选中的图片
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 图片展示区 */}
          <div
            className={`flex-1 overflow-y-auto ${
              darkMode ? "bg-gray-900" : "bg-gray-50"
            }`}
          >
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-16">
                  <svg
                    className={`mx-auto h-24 w-24 ${
                      darkMode ? "text-gray-600" : "text-gray-400"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <h3
                    className={`mt-4 text-lg font-medium ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {searchQuery
                      ? "没有找到匹配的图片"
                      : selectedDirectory
                      ? "此目录中没有找到图片"
                      : "没有找到图片"}
                  </h3>
                  <p
                    className={`mt-2 text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {searchQuery
                      ? "尝试使用不同的搜索关键词，或清除搜索条件"
                      : selectedDirectory
                      ? "尝试选择其他目录或清除过滤器"
                      : "请将图片文件放入 public/images 目录"}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className={`mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        darkMode
                          ? "bg-blue-900 hover:bg-blue-800 focus:ring-offset-gray-900"
                          : "bg-blue-50 hover:bg-blue-100"
                      }`}
                    >
                      清除搜索
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredImages.map((image, index) => (
                    <div
                      key={index}
                      className={`relative ${
                        darkMode ? "bg-gray-800" : "bg-white"
                      } rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 ${
                        selectedImages.has(image.url) ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      {/* 复选框 */}
                      {isSelectionMode && (
                        <div 
                          className="absolute top-2 right-2 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(image.url);
                          }}
                        >
                          <div className={`w-6 h-6 rounded border-2 cursor-pointer transition-all ${
                            selectedImages.has(image.url)
                              ? 'bg-blue-600 border-blue-600'
                              : darkMode
                              ? 'bg-gray-700 border-gray-400 hover:border-gray-300'
                              : 'bg-white border-gray-300 hover:border-gray-400'
                          }`}>
                            {selectedImages.has(image.url) && (
                              <svg className="w-4 h-4 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )}

                      <div
                        className={`relative h-48 ${
                          darkMode ? "bg-gray-700" : "bg-gray-100"
                        } cursor-pointer group`}
                        onClick={() => {
                          if (isSelectionMode) {
                            toggleSelection(image.url);
                          } else {
                            openModal(image);
                          }
                        }}
                      >
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {!isSelectionMode && (
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200 flex items-center justify-center">
                            <svg
                              className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p
                          className={`text-sm font-medium ${
                            darkMode ? "text-white" : "text-gray-900"
                          } truncate mb-2`}
                        >
                          {image.name}
                        </p>
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-xs ${
                              darkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {formatFileSize(image.size)}
                          </p>
                          {!isSelectionMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(image);
                              }}
                              className={`p-1.5 rounded-md transition-colors ${
                                darkMode
                                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                              }`}
                              title="下载图片"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex flex-col"
          >
            <div 
              className="relative flex-1 flex items-center justify-center p-4 min-h-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-2"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* 上一张按钮 */}
              {currentImageIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevImage();
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-all bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-3 backdrop-blur-sm"
                  title="上一张 (←)"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}

              {/* 下一张按钮 */}
              {currentImageIndex < filteredImages.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextImage();
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-all bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-3 backdrop-blur-sm"
                  title="下一张 (→)"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
              
              <div className="relative w-full h-full flex items-center justify-center">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  </div>
                )}
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name}
                  className="max-w-full max-h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                  onLoad={() => setImageLoading(false)}
                  onLoadStart={() => setImageLoading(true)}
                  style={{
                    opacity: imageLoading ? 0 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                />
              </div>
            </div>
            
            {/* 底部信息栏 - 固定在底部 */}
            <div 
              className="flex-shrink-0 w-full text-center py-4 bg-black bg-opacity-30 backdrop-blur-md border-t border-white border-opacity-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white text-sm mb-3 drop-shadow-lg">
                <p className="font-medium">{selectedImage.name}</p>
                <div className="flex justify-center items-center gap-4 text-xs text-gray-200 mt-1">
                  <span>📷 {currentImageIndex + 1} / {filteredImages.length}</span>
                  {selectedImage.directory && (
                    <span>📁 {selectedImage.directory}</span>
                  )}
                  {selectedImage.size && (
                    <span>📊 {formatFileSize(selectedImage.size)}</span>
                  )}
                </div>
              </div>
              <div className="flex justify-center items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(selectedImage);
                  }}
                  className="bg-blue-600 bg-opacity-90 hover:bg-blue-700 hover:bg-opacity-95 text-white py-2 px-6 rounded transition-all duration-200 shadow-lg backdrop-blur-sm"
                >
                  下载图片
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
