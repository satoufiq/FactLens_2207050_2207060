from setuptools import find_packages, setup

setup(
    name="factlens-common",
    version="3.0.0",
    description="Shared FactLens infrastructure: providers, model registry, scan lifecycle, schema",
    packages=find_packages(include=["factlens_common", "factlens_common.*"]),
    include_package_data=True,
    python_requires=">=3.10",
    install_requires=[
        "sqlalchemy>=2.0.0",
        "pydantic>=2.8.0",
    ],
    extras_require={
        # Installed per-service by the service's own requirements.txt.
        "queue": ["celery>=5.4.0", "redis>=5.0.0"],
        "onnx": ["onnxruntime>=1.18.0"],
        "ocr": ["easyocr>=1.7.1", "pytesseract>=0.3.10"],
        "auth": ["bcrypt>=4.1.0"],
    },
)
