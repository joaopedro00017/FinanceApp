package com.soujoaopedro.gerenciador_de_financas.dto;

import com.soujoaopedro.gerenciador_de_financas.domain.TipoTransacao;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransacaoRequestDTO(
        String descricao,
        BigDecimal valor,
        LocalDate data,
        TipoTransacao tipo
) {}
