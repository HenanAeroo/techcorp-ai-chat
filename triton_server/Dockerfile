FROM nvcr.io/nvidia/tritonserver:24.08-pyt-python-py3

# torch épinglé EN PREMIER (CUDA 12.4). L'image -pyt- ne fournit PAS de torch
# pip (son PyTorch est le libtorch C++ du backend). Sans ce pin, transformers
# et bitsandbytes tirent torch 2.12+cu130 → casse bitsandbytes 0.44.1 :
#   - binaire libbitsandbytes_cuda130.so absent (=> "compiled without GPU support")
#   - triton 3.7 embarqué a supprimé triton.ops (=> ModuleNotFoundError).
# torch 2.4.1 => triton 3.0 (a encore triton.ops) ; cu124 => bnb a son binaire
# libbitsandbytes_cuda124.so. Appariement connu-bon de l'ère Triton 24.08.
RUN pip install --no-cache-dir torch==2.4.1 --index-url https://download.pytorch.org/whl/cu124

# Dépendances d'inférence (alignées sur la correction de référence youen-v)
# + bitsandbytes : requis par notre chargement 4-bit (model.py) — contrainte
# 6 Go VRAM (RTX 3050 Laptop). torch étant déjà épinglé, ces paquets ne le
# réinstallent pas.
RUN pip install --no-cache-dir \
    transformers==4.45.2 \
    accelerate==0.34.2 \
    sentencepiece==0.2.0 \
    einops==0.8.0 \
    protobuf==4.25.3 \
    bitsandbytes==0.44.1
