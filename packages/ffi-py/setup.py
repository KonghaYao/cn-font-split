from setuptools import setup, find_packages

setup(
    name="cn_font_split",
    version="7.1.0",
    description="A revolutionary font subsetter that supports CJK and any characters!",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/KonghaYao/cn-font-split/tree/release/packages/ffi-py",
    author="KonghaYao",
    author_email="3446798488@qq.com",
    license="Apache-2.0",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    keywords="font converter performance wasm woff2 ttf otf opentype-fonts font-subsetter font-subset cjk",
    # Adjust as necessary
    packages=find_packages(exclude=["contrib", "docs", "tests"]),
    install_requires=[  # Include your dependencies here
        "google===3.0.0",
        "protobuf==5.29.2",
    ],
    entry_points={
        "console_scripts": [
            # Assuming you have a CLI entry point
            "cn-font-split-py=cn_font_split.cli:main",
        ],
    },
    package_dir={"cn_font_split": "cn_font_split"},
    package_data={
        "": ["*.ps1", "*.sh"],  # 空字符串表示所有包
        # 或者针对特定包
        # 'specific_package': ['*.ps1', '*.sh'],
    },
    project_urls={
        "Homepage": "https://chinese-font.netlify.app/",
        "Source": "https://github.com/KonghaYao/cn-font-split/tree/release/packages/ffi-py",
    },
)
